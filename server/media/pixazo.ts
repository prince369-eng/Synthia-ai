import { ENV } from "../_core/env";
import { assertPublicWebDestination } from "../agent/publicWebPolicy";
import { logger } from "../security/logger";

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_AUDIO_BYTES = 128 * 1024 * 1024;
const TRACKS_POLL_INTERVAL_MS = 5_000;
const TRACKS_MAX_POLLS = 24;

type PixazoDirectMediaKind = "image" | "video";
export type PixazoMediaKind = PixazoDirectMediaKind | "audio";

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

const routeFor: Record<PixazoDirectMediaKind, { path: string; defaultModel: string; mimeType: string }> = {
  image: { path: "/flux/text-to-image", defaultModel: "flux", mimeType: "image/png" },
  video: { path: "/ltx/text-to-video", defaultModel: "ltx", mimeType: "video/mp4" },
};

function configuredModels(kind: PixazoMediaKind) {
  return kind === "image" ? ENV.pixazoImageModels : kind === "video" ? ENV.pixazoVideoModels : ENV.pixazoAudioModels;
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

function selectedModel(kind: PixazoDirectMediaKind, requested: string | undefined, models: string[]) {
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

function expectedMimeType(kind: PixazoDirectMediaKind, header: string | null) {
  const mimeType = header?.split(";", 1)[0]?.trim().toLowerCase() || routeFor[kind].mimeType;
  if (kind === "image" && !["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an unsupported image MIME type.");
  }
  if (kind === "video" && mimeType !== "video/mp4") {
    throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an unsupported video MIME type.");
  }
  return mimeType;
}

async function generate(kind: PixazoDirectMediaKind, input: { prompt: string; model?: string; aspectRatio?: string; referenceAttached?: boolean }): Promise<GeneratedPixazoMedia> {
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

function tracksRequestId(value: unknown) {
  if (typeof value !== "string" || !/^tracks_[a-zA-Z0-9-]{8,180}$/.test(value)) {
    throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an invalid audio request identifier.");
  }
  return value;
}

async function jsonBody(response: Response, message: string): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid object");
    return value as Record<string, unknown>;
  } catch {
    throw new PixazoMediaError("INVALID_RESPONSE", message);
  }
}

function tracksOutputUrl(value: unknown) {
  const candidate = Array.isArray(value) ? value.find(item => typeof item === "string") : value;
  if (typeof candidate !== "string" || candidate.length > 2_048) {
    throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned no valid audio output URL.");
  }
  return candidate;
}

function audioMimeType(header: string | null, declared: unknown) {
  const responseType = header?.split(";", 1)[0]?.trim().toLowerCase();
  const declaredType = typeof declared === "string" ? declared.split(";", 1)[0]?.trim().toLowerCase() : undefined;
  const mimeType = responseType && responseType !== "application/octet-stream" ? responseType : declaredType;
  if (!mimeType?.startsWith("audio/")) {
    throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an unsupported audio MIME type.");
  }
  return mimeType;
}

async function resolveTracksAudio(input: { prompt: string; model?: string }): Promise<GeneratedPixazoMedia> {
  const models = assertConfigured("audio");
  const model = input.model?.trim() || models[0];
  if (!models.includes(model) || model.toLowerCase() !== "tracks") {
    throw new PixazoMediaError("INVALID_REQUEST", "The configured Pixazo audio route supports the documented tracks model identifier only.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const baseUrl = ENV.pixazoBaseUrl.replace(/\/$/, "");
  try {
    const submission = await fetch(`${baseUrl}/tracks/v1/generate`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": ENV.pixazoApiKey,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ prompt: assertPrompt(input.prompt) }),
      signal: controller.signal,
    });
    if (submission.status !== 202) {
      logger.warn({ event: "pixazo_tracks_submission_error", status: submission.status }, "Pixazo Tracks audio submission failed");
      throw new PixazoMediaError("PROVIDER_ERROR", "Pixazo audio generation failed. Please retry shortly.");
    }
    const requestId = tracksRequestId((await jsonBody(submission, "Pixazo returned an invalid audio submission response.")).request_id);

    for (let poll = 0; poll < TRACKS_MAX_POLLS; poll += 1) {
      const statusResponse = await fetch(`${baseUrl}/v2/requests/status/${encodeURIComponent(requestId)}`, {
        headers: { "Ocp-Apim-Subscription-Key": ENV.pixazoApiKey },
        signal: controller.signal,
      });
      if (!statusResponse.ok) {
        logger.warn({ event: "pixazo_tracks_status_error", status: statusResponse.status }, "Pixazo Tracks audio status request failed");
        throw new PixazoMediaError("PROVIDER_ERROR", "Pixazo audio generation status could not be retrieved. Please retry shortly.");
      }
      const status = await jsonBody(statusResponse, "Pixazo returned an invalid audio status response.");
      const state = typeof status.status === "string" ? status.status.toUpperCase() : "";
      if (state === "COMPLETED") {
        const output = status.output;
        if (!output || typeof output !== "object" || Array.isArray(output)) {
          throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo completed audio generation without an output artifact.");
        }
        const record = output as Record<string, unknown>;
        const destination = await assertPublicWebDestination(tracksOutputUrl(record.media_url));
        const artifact = await fetch(destination, {
          headers: { Accept: "audio/*" },
          redirect: "error",
          signal: controller.signal,
        });
        if (!artifact.ok) {
          throw new PixazoMediaError("PROVIDER_ERROR", "Pixazo audio artifact retrieval failed. Please retry shortly.");
        }
        const bytes = Buffer.from(await artifact.arrayBuffer());
        if (bytes.length === 0 || bytes.length > MAX_AUDIO_BYTES) {
          throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an invalid or oversized audio artifact.");
        }
        return { kind: "audio", provider: "pixazo", model, interactionId: requestId, mimeType: audioMimeType(artifact.headers.get("content-type"), record.media_type), bytes };
      }
      if (state === "FAILED" || state === "ERROR") {
        logger.warn({ event: "pixazo_tracks_generation_error", requestId, state }, "Pixazo Tracks audio generation failed");
        throw new PixazoMediaError("PROVIDER_ERROR", "Pixazo audio generation failed. Please retry shortly.");
      }
      if (state !== "QUEUED" && state !== "PROCESSING") {
        throw new PixazoMediaError("INVALID_RESPONSE", "Pixazo returned an unknown audio generation status.");
      }
      await new Promise(resolve => setTimeout(resolve, TRACKS_POLL_INTERVAL_MS));
    }
    throw new PixazoMediaError("PROVIDER_ERROR", "Pixazo audio generation timed out. Please retry shortly.");
  } catch (error) {
    if (error instanceof PixazoMediaError) throw error;
    const message = error instanceof Error && error.name === "AbortError"
      ? "Pixazo audio generation timed out. Please retry shortly."
      : "Pixazo audio generation could not be reached. Please retry shortly.";
    logger.warn({ event: "pixazo_tracks_transport_error", error: error instanceof Error ? error.message : "unknown" }, "Pixazo Tracks audio transport failed");
    throw new PixazoMediaError("PROVIDER_ERROR", message);
  } finally {
    clearTimeout(timeout);
  }
}

export function generatePixazoAudio(input: { prompt: string; model?: string }) {
  return resolveTracksAudio(input);
}
