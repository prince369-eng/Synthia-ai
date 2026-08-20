import { ENV } from "../_core/env";
import { logger } from "../security/logger";

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export type PixazoMediaKind = "image" | "video";

export type GeneratedPixazoMedia = {
  kind: PixazoMediaKind;
  provider: "pixazo";
  model: string;
  interactionId: string | null;
  mimeType: string;
  bytes: Buffer;
};

export class PixazoMediaError extends Error {
  constructor(
    readonly code: "CONFIGURATION_REQUIRED" | "INVALID_REQUEST" | "PROVIDER_ERROR" | "INVALID_RESPONSE",
    message: string,
  ) {
    super(message);
    this.name = "PixazoMediaError";
  }
}

const routeFor: Record<PixazoMediaKind, { path: string; defaultModel: string; mimeType: string }> = {
  image: { path: "/flux/text-to-image", defaultModel: "flux", mimeType: "image/png" },
  video: { path: "/ltx/text-to-video", defaultModel: "ltx", mimeType: "video/mp4" },
};

function configuredModels(kind: PixazoMediaKind) {
  return kind === "image" ? ENV.pixazoImageModels : ENV.pixazoVideoModels;
}

function assertConfigured(kind: PixazoMediaKind) {
  const models = configuredModels(kind);
  if (!ENV.pixazoGenerationEnabled || !ENV.pixazoApiKey || models.length === 0) {
    throw new PixazoMediaError(
      "CONFIGURATION_REQUIRED",
      `Pixazo ${kind} generation requires PIXAZO_API_KEY, an allowlisted PIXAZO_${kind.toUpperCase()}_MODELS value, and SYNTHIA_PIXAZO_GENERATION_ENABLED=true. This explicit switch prevents unapproved quota use.`,
    );
  }
  return models;
}

function assertPrompt(prompt: string) {
  const value = prompt.trim();
  if (value.length < 3 || value.length > 4_000) {
    throw new PixazoMediaError("INVALID_REQUEST", "A media prompt must be between 3 and 4,000 characters.");
  }
  return value;
}

function selectedModel(kind: PixazoMediaKind, requested: string | undefined, models: string[]) {
  const model = requested?.trim() || models[0];
  if (!models.includes(model)) {
    throw new PixazoMediaError("INVALID_REQUEST", `The requested Pixazo ${kind} model is not configured.`);
  }
  const documentedDefault = routeFor[kind].defaultModel;
  if (model.toLowerCase() !== documentedDefault) {
    throw new PixazoMediaError(
      "INVALID_REQUEST",
      `The configured Pixazo ${kind} route supports the documented ${documentedDefault} model identifier only.`,
    );
  }
  return model;
}

function expectedMimeType(kind: PixazoMediaKind, header: string | null) {
  const mimeType = header?.split(";", 1)[0]?.trim().toLowerCase() || routeFor[kind].mimeType;
  if (kind === "image" && !["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an unsupported image MIME type.");
  }
  if (kind === "video" && mimeType !== "video/mp4") {
    throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an unsupported video MIME type.");
  }
  return mimeType;
}

async function generate(kind: PixazoMediaKind, input: { prompt: string; model?: string; aspectRatio?: string; referenceAttached?: boolean }): Promise<GeneratedPixazoMedia> {
  if (input.referenceAttached) {
    throw new PixazoMediaError("INVALID_REQUEST", "Pixazo free-route generation currently supports text-only prompts; remove the image reference or choose a configured Gemini model.");
  }
  const models = assertConfigured(kind);
  const model = selectedModel(kind, input.model, models);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${ENV.pixazoBaseUrl.replace(/\/$/, "")}${routeFor[kind].path}`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": ENV.pixazoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: assertPrompt(input.prompt), ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}) }),
      signal: controller.signal,
    });
    if (!response.ok) {
      logger.warn({ event: "pixazo_media_provider_error", kind, status: response.status }, "Pixazo media generation request failed");
      throw new PixazoMediaError("PROVIDER_ERROR", "Pixazo media generation failed. Please retry shortly.");
    }
    const mimeType = expectedMimeType(kind, response.headers.get("content-type"));
    const bytes = Buffer.from(await response.arrayBuffer());
    const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (bytes.length === 0 || bytes.length > limit) {
      throw new PixazoMediaError("INVALID_RESPONSE", `Pixazo returned an invalid or oversized ${kind} artifact.`);
    }
    return { kind, provider: "pixazo", model, interactionId: response.headers.get("x-request-id"), mimeType, bytes };
  } catch (error) {
    if (error instanceof PixazoMediaError) throw error;
    const message = error instanceof Error && error.name === "AbortError"
      ? "Pixazo media generation timed out. Please retry shortly."
      : "Pixazo media generation could not be reached. Please retry shortly.";
    logger.warn({ event: "pixazo_media_transport_error", kind, error: error instanceof Error ? error.message : "unknown" }, "Pixazo media transport failed");
    throw new PixazoMediaError("PROVIDER_ERROR", message);
  } finally {
    clearTimeout(timeout);
  }
}

export function generatePixazoImage(input: { prompt: string; model?: string; aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"; referenceAttached?: boolean }) {
  return generate("image", input);
}

export function generatePixazoVideo(input: { prompt: string; model?: string; aspectRatio?: "16:9" | "9:16"; referenceAttached?: boolean }) {
  return generate("video", input);
}
