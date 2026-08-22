import { ENV } from "../_core/env";
import { mediaReadiness } from "../mediaCapabilities";
import { logger } from "../security/logger";

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export type GeminiMediaKind = "image" | "video";

export type GeminiMediaReference = {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  data: Buffer;
};

export type GeneratedGeminiMedia = {
  kind: GeminiMediaKind;
  provider: "gemini" | "gemini-omni-flash";
  model: string;
  interactionId: string | null;
  mimeType: string;
  bytes: Buffer;
};

export class GeminiMediaError extends Error {
  constructor(
    readonly code: "CONFIGURATION_REQUIRED" | "INVALID_REQUEST" | "PROVIDER_ERROR" | "INVALID_RESPONSE",
    message: string,
  ) {
    super(message);
    this.name = "GeminiMediaError";
  }
}

type GeminiContentItem = {
  type?: string;
  mime_type?: string;
  mimeType?: string;
  data?: string;
};

type GeminiInteractionResponse = {
  id?: string;
  status?: string;
  steps?: Array<{ type?: string; content?: GeminiContentItem[] }>;
};

function configuredCapability(kind: GeminiMediaKind) {
  const capabilities = mediaReadiness({
    forgeApiUrl: ENV.forgeApiUrl,
    forgeApiKey: ENV.forgeApiKey,
    geminiApiKey: ENV.geminiApiKey,
    imageProvider: ENV.imageProvider,
    imageModels: ENV.imageModels,
    videoProvider: ENV.videoProvider,
    videoModels: ENV.videoModels,
    videoApiKey: ENV.videoApiKey,
    aihubmixApiKey: ENV.aihubmixApiKey,
    aihubmixGenerationEnabled: ENV.aihubmixGenerationEnabled,
    aihubmixArtifactAllowedHosts: ENV.aihubmixArtifactAllowedHosts,
  });
  const capability = capabilities[kind];
  const expectedProvider = kind === "image" ? "gemini" : "gemini-omni-flash";
  if (!capability.configured || capability.provider !== expectedProvider || !ENV.geminiApiKey) {
    throw new GeminiMediaError(
      "CONFIGURATION_REQUIRED",
      kind === "image"
        ? "Gemini image generation is unavailable until GEMINI_API_KEY, SYNTHIA_IMAGE_PROVIDER=gemini, and SYNTHIA_IMAGE_MODELS are configured."
        : "Gemini Omni Flash video generation is unavailable until GEMINI_API_KEY, SYNTHIA_VIDEO_PROVIDER=gemini-omni-flash, and SYNTHIA_VIDEO_MODELS are configured.",
    );
  }
  return capability;
}

function assertPrompt(prompt: string) {
  const value = prompt.trim();
  if (value.length < 3 || value.length > 4_000) {
    throw new GeminiMediaError("INVALID_REQUEST", "A media prompt must be between 3 and 4,000 characters.");
  }
  return value;
}

function binaryFromInteraction(response: GeminiInteractionResponse, expectedType: GeminiMediaKind, maxBytes: number) {
  const content = response.steps
    ?.filter(step => step.type === "model_output")
    .flatMap(step => step.content ?? [])
    .find(item => item.type === expectedType && typeof item.data === "string");

  if (!content?.data) {
    throw new GeminiMediaError("INVALID_RESPONSE", `Gemini did not return a ${expectedType} artifact.`);
  }

  const bytes = Buffer.from(content.data, "base64");
  if (bytes.length === 0 || bytes.length > maxBytes) {
    throw new GeminiMediaError("INVALID_RESPONSE", `Gemini returned an invalid or oversized ${expectedType} artifact.`);
  }

  const mimeType = content.mime_type ?? content.mimeType ?? (expectedType === "image" ? "image/png" : "video/mp4");
  if (expectedType === "image" && !["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw new GeminiMediaError("INVALID_RESPONSE", "Gemini returned an unsupported image MIME type.");
  }
  if (expectedType === "video" && mimeType !== "video/mp4") {
    throw new GeminiMediaError("INVALID_RESPONSE", "Gemini returned an unsupported video MIME type.");
  }
  return { bytes, mimeType };
}

async function createInteraction(input: Record<string, unknown>): Promise<GeminiInteractionResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": ENV.geminiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      logger.warn(
        { event: "gemini_media_provider_error", status: response.status, body: raw.slice(0, 600) },
        "Gemini media generation request failed",
      );
      throw new GeminiMediaError("PROVIDER_ERROR", "Gemini media generation failed. Please retry shortly.");
    }
    try {
      return JSON.parse(raw) as GeminiInteractionResponse;
    } catch {
      throw new GeminiMediaError("INVALID_RESPONSE", "Gemini returned an invalid media-generation response.");
    }
  } catch (error) {
    if (error instanceof GeminiMediaError) throw error;
    const errorCategory = error instanceof Error && error.name === "AbortError"
      ? "timeout"
      : error instanceof TypeError
        ? "network"
        : "unknown";
    const message = errorCategory === "timeout"
      ? "Gemini media generation timed out. Please retry shortly."
      : "Gemini media generation could not be reached. Please retry shortly.";
    logger.warn({ event: "gemini_media_transport_error", errorCategory }, "Gemini media transport failed");
    throw new GeminiMediaError("PROVIDER_ERROR", message);
  } finally {
    clearTimeout(timeout);
  }
}

function imageInput(prompt: string, reference?: GeminiMediaReference) {
  const input: Array<Record<string, string>> = [{ type: "text", text: prompt }];
  if (reference) {
    input.push({ type: "image", mime_type: reference.mimeType, data: reference.data.toString("base64") });
  }
  return input;
}

export async function generateGeminiImage(input: {
  prompt: string;
  model?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  reference?: GeminiMediaReference;
}): Promise<GeneratedGeminiMedia> {
  const capability = configuredCapability("image");
  const model = input.model?.trim() || capability.models[0];
  if (!capability.models.includes(model)) {
    throw new GeminiMediaError("INVALID_REQUEST", "The requested Gemini image model is not configured.");
  }
  const response = await createInteraction({
    model,
    input: imageInput(assertPrompt(input.prompt), input.reference),
    response_format: { type: "image", aspect_ratio: input.aspectRatio ?? "1:1" },
  });
  const artifact = binaryFromInteraction(response, "image", MAX_IMAGE_BYTES);
  return { kind: "image", provider: "gemini", model, interactionId: response.id ?? null, ...artifact };
}

export async function generateGeminiVideo(input: {
  prompt: string;
  model?: string;
  aspectRatio?: "16:9" | "9:16";
  reference?: GeminiMediaReference;
}): Promise<GeneratedGeminiMedia> {
  const capability = configuredCapability("video");
  const model = input.model?.trim() || capability.models[0];
  if (!capability.models.includes(model)) {
    throw new GeminiMediaError("INVALID_REQUEST", "The requested Gemini video model is not configured.");
  }
  const response = await createInteraction({
    model,
    input: imageInput(assertPrompt(input.prompt), input.reference),
    response_format: { type: "video", aspect_ratio: input.aspectRatio ?? "16:9" },
    generation_config: input.reference ? { video_config: { task: "image_to_video" } } : { video_config: { task: "text_to_video" } },
  });
  const artifact = binaryFromInteraction(response, "video", MAX_VIDEO_BYTES);
  return { kind: "video", provider: "gemini-omni-flash", model, interactionId: response.id ?? null, ...artifact };
}
