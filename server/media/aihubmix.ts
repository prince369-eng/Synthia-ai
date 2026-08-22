import { ENV } from "../_core/env";
import { logger } from "../security/logger";

const REQUEST_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 45;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_AUDIO_BYTES = 32 * 1024 * 1024;

export type AIHubMixMediaKind = "image" | "video" | "audio";

export type GeneratedAIHubMixMedia = {
  kind: AIHubMixMediaKind;
  provider: "aihubmix";
  model: string;
  interactionId: string | null;
  mimeType: string;
  bytes: Buffer;
};

export class AIHubMixMediaError extends Error {
  constructor(
    readonly code: "CONFIGURATION_REQUIRED" | "INVALID_REQUEST" | "PROVIDER_ERROR" | "INVALID_RESPONSE",
    message: string,
  ) {
    super(message);
    this.name = "AIHubMixMediaError";
  }
}

type ProviderRecord = Record<string, unknown>;

function record(value: unknown): ProviderRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as ProviderRecord : null;
}

function configuredModels(kind: AIHubMixMediaKind) {
  if (kind === "image") return ENV.aihubmixImageModels;
  if (kind === "video") return ENV.aihubmixVideoModels;
  return ENV.aihubmixAudioModels;
}

function configuredModel(kind: AIHubMixMediaKind, requested: string | undefined) {
  const models = configuredModels(kind);
  if (!ENV.aihubmixGenerationEnabled || !ENV.aihubmixApiKey || models.length === 0) {
    throw new AIHubMixMediaError(
      "CONFIGURATION_REQUIRED",
      `AIHubMix ${kind} generation requires AIHUBMIX_API_KEY, an allowlisted AIHUBMIX_${kind.toUpperCase()}_MODELS value, and SYNTHIA_AIHUBMIX_GENERATION_ENABLED=true. This switch prevents unapproved quota use.`,
    );
  }
  const model = requested?.trim() || models[0];
  if (!models.includes(model)) {
    throw new AIHubMixMediaError("INVALID_REQUEST", `The requested AIHubMix ${kind} model is not configured.`);
  }
  return model;
}

function prompt(value: string, maximum = 4_000) {
  const normalized = value.trim();
  if (normalized.length < 3 || normalized.length > maximum) {
    throw new AIHubMixMediaError("INVALID_REQUEST", `A ${maximum === 4_096 ? "text-to-speech input" : "media prompt"} must be between 3 and ${maximum.toLocaleString()} characters.`);
  }
  return normalized;
}

function baseUrl() {
  return ENV.aihubmixBaseUrl.replace(/\/$/, "");
}

function authorizationHeaders() {
  return { Authorization: `Bearer ${ENV.aihubmixApiKey}`, "Content-Type": "application/json" };
}

function contentType(kind: AIHubMixMediaKind, header: string | null) {
  const mimeType = header?.split(";", 1)[0]?.trim().toLowerCase() || "";
  if (kind === "image" && ["image/png", "image/jpeg", "image/webp"].includes(mimeType)) return mimeType;
  if (kind === "video" && mimeType === "video/mp4") return mimeType;
  if (kind === "audio" && ["audio/mpeg", "audio/ogg", "audio/aac", "audio/flac", "audio/wav", "audio/pcm"].includes(mimeType)) return mimeType;
  throw new AIHubMixMediaError("INVALID_RESPONSE", `AIHubMix returned an unsupported ${kind} MIME type.`);
}

function byteLimit(kind: AIHubMixMediaKind) {
  return kind === "image" ? MAX_IMAGE_BYTES : kind === "video" ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
}

function assertBytes(kind: AIHubMixMediaKind, bytes: Buffer) {
  if (bytes.length === 0 || bytes.length > byteLimit(kind)) {
    throw new AIHubMixMediaError("INVALID_RESPONSE", `AIHubMix returned an invalid or oversized ${kind} artifact.`);
  }
  return bytes;
}

function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function taskId(payload: unknown) {
  const value = record(payload);
  const data = record(value?.data);
  const candidate = value?.task_id ?? value?.taskId ?? value?.id ?? data?.task_id ?? data?.taskId ?? data?.id;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function artifactUrl(payload: unknown): string | null {
  const value = record(payload);
  const data = record(value?.data);
  const output = record(value?.output) ?? record(data?.output) ?? record(value?.result) ?? record(data?.result);
  const arrays = [value?.data, value?.outputs, value?.urls, data?.data, data?.outputs, output?.data, output?.urls];
  const direct = [value?.url, value?.output_url, value?.video_url, data?.url, data?.output_url, data?.video_url, output?.url, output?.output_url, output?.video_url]
    .find(item => typeof item === "string" && item.length > 0);
  if (typeof direct === "string") return direct;
  for (const candidate of arrays) {
    if (!Array.isArray(candidate)) continue;
    for (const entry of candidate) {
      if (typeof entry === "string" && entry.length > 0) return entry;
      const item = record(entry);
      const url = item?.url ?? item?.output_url ?? item?.video_url;
      if (typeof url === "string" && url.length > 0) return url;
    }
  }
  return null;
}

function complete(payload: unknown) {
  const value = record(payload);
  const data = record(value?.data);
  const status = String(value?.status ?? data?.status ?? "").toLowerCase();
  if (["failed", "cancelled", "canceled", "error"].includes(status)) {
    throw new AIHubMixMediaError("PROVIDER_ERROR", "AIHubMix reported that media generation failed.");
  }
  return ["completed", "complete", "succeeded", "success", "finished"].includes(status) || Boolean(artifactUrl(payload));
}

function safeArtifactUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AIHubMixMediaError("INVALID_RESPONSE", "AIHubMix returned an invalid artifact URL.");
  }
  const hostname = parsed.hostname.toLowerCase();
  const hostAllowed = ENV.aihubmixArtifactAllowedHosts.some(allowed => hostname === allowed || hostname.endsWith(`.${allowed}`));
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || !hostAllowed) {
    throw new AIHubMixMediaError("INVALID_RESPONSE", "AIHubMix returned an unsafe artifact URL.");
  }
  return parsed.toString();
}

function transportErrorCategory(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  if (error instanceof TypeError) return "network";
  return "unknown";
}

async function requestJson(url: string, init: RequestInit, controller: AbortController) {
  const response = await fetch(url, { ...init, signal: controller.signal });
  if (!response.ok) {
    throw new AIHubMixMediaError("PROVIDER_ERROR", "AIHubMix media generation failed. Please retry shortly.");
  }
  try {
    return await response.json() as unknown;
  } catch {
    throw new AIHubMixMediaError("INVALID_RESPONSE", "AIHubMix returned an invalid media response.");
  }
}

async function resolveTaskArtifact(kind: "image" | "video", id: string, controller: AbortController) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await wait(POLL_INTERVAL_MS);
    const payload = await requestJson(`${baseUrl()}/tasks/${encodeURIComponent(id)}`, { headers: authorizationHeaders() }, controller);
    if (!complete(payload)) continue;
    const url = artifactUrl(payload);
    if (!url) throw new AIHubMixMediaError("INVALID_RESPONSE", "AIHubMix completed media generation without a downloadable artifact.");
    const artifact = await fetch(safeArtifactUrl(url), { signal: controller.signal });
    if (!artifact.ok) throw new AIHubMixMediaError("PROVIDER_ERROR", "AIHubMix generated media could not be retrieved.");
    return { mimeType: contentType(kind, artifact.headers.get("content-type")), bytes: assertBytes(kind, Buffer.from(await artifact.arrayBuffer())) };
  }
  throw new AIHubMixMediaError("PROVIDER_ERROR", "AIHubMix media generation timed out. Please retry shortly.");
}

async function generateImage(input: { prompt: string; model?: string; aspectRatio?: string; referenceAttached?: boolean }): Promise<GeneratedAIHubMixMedia> {
  if (input.referenceAttached) throw new AIHubMixMediaError("INVALID_REQUEST", "AIHubMix image references are not enabled until the selected model’s editing contract is configured.");
  const model = configuredModel("image", input.model);
  if (ENV.aihubmixArtifactAllowedHosts.length === 0) {
    throw new AIHubMixMediaError("CONFIGURATION_REQUIRED", "AIHubMix image generation requires AIHUBMIX_ARTIFACT_ALLOWED_HOSTS before Synthia can retrieve a generated artifact.");
  }
  if (!model.includes("/")) throw new AIHubMixMediaError("INVALID_REQUEST", "AIHubMix image models must include their documented provider namespace, for example openai/gpt-image-1.5.");
  const size = ({ "1:1": "1024x1024", "16:9": "1792x1024", "9:16": "1024x1792", "4:3": "1536x1024", "3:4": "1024x1536" } as Record<string, string>)[input.aspectRatio ?? ""];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const payload = await requestJson(`${baseUrl()}/models/${model.split("/").map(encodeURIComponent).join("/")}/predictions`, {
      method: "POST", headers: authorizationHeaders(), body: JSON.stringify({ input: { prompt: prompt(input.prompt), ...(size ? { size } : {}) } }),
    }, controller);
    const id = taskId(payload);
    if (!id) throw new AIHubMixMediaError("INVALID_RESPONSE", "AIHubMix did not return an image task identifier.");
    const artifact = await resolveTaskArtifact("image", id, controller);
    return { kind: "image", provider: "aihubmix", model, interactionId: id, ...artifact };
  } catch (error) {
    if (error instanceof AIHubMixMediaError) throw error;
    const errorCategory = transportErrorCategory(error);
    logger.warn({ event: "aihubmix_image_transport_error", errorCategory }, "AIHubMix image transport failed");
    throw new AIHubMixMediaError("PROVIDER_ERROR", errorCategory === "timeout" ? "AIHubMix image generation timed out. Please retry shortly." : "AIHubMix image generation could not be reached. Please retry shortly.");
  } finally { clearTimeout(timeout); }
}

async function generateVideo(input: { prompt: string; model?: string; aspectRatio?: "16:9" | "9:16"; referenceAttached?: boolean }): Promise<GeneratedAIHubMixMedia> {
  if (input.referenceAttached) throw new AIHubMixMediaError("INVALID_REQUEST", "AIHubMix video references are not enabled until the selected model’s image-to-video contract is configured.");
  const model = configuredModel("video", input.model);
  if (ENV.aihubmixArtifactAllowedHosts.length === 0) {
    throw new AIHubMixMediaError("CONFIGURATION_REQUIRED", "AIHubMix video generation requires AIHUBMIX_ARTIFACT_ALLOWED_HOSTS before Synthia can retrieve a generated artifact.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let id: string | null = null;
  try {
    const payload = await requestJson(`${baseUrl()}/videos`, { method: "POST", headers: authorizationHeaders(), body: JSON.stringify({ model, prompt: prompt(input.prompt), ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}) }) }, controller);
    id = taskId(payload);
    if (!id) throw new AIHubMixMediaError("INVALID_RESPONSE", "AIHubMix did not return a video task identifier.");
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await wait(POLL_INTERVAL_MS);
      const status = await requestJson(`${baseUrl()}/videos/${encodeURIComponent(id)}`, { headers: authorizationHeaders() }, controller);
      if (!complete(status)) continue;
      const artifact = await fetch(`${baseUrl()}/videos/${encodeURIComponent(id)}/content`, { headers: { Authorization: `Bearer ${ENV.aihubmixApiKey}` }, signal: controller.signal });
      if (!artifact.ok) throw new AIHubMixMediaError("PROVIDER_ERROR", "AIHubMix generated video could not be retrieved.");
      return { kind: "video", provider: "aihubmix", model, interactionId: id, mimeType: contentType("video", artifact.headers.get("content-type")), bytes: assertBytes("video", Buffer.from(await artifact.arrayBuffer())) };
    }
    throw new AIHubMixMediaError("PROVIDER_ERROR", "AIHubMix video generation timed out. Please retry shortly.");
  } catch (error) {
    if (error instanceof AIHubMixMediaError) throw error;
    const errorCategory = transportErrorCategory(error);
    logger.warn({ event: "aihubmix_video_transport_error", errorCategory }, "AIHubMix video transport failed");
    throw new AIHubMixMediaError("PROVIDER_ERROR", errorCategory === "timeout" ? "AIHubMix video generation timed out. Please retry shortly." : "AIHubMix video generation could not be reached. Please retry shortly.");
  } finally {
    clearTimeout(timeout);
    if (id) void fetch(`${baseUrl()}/videos/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${ENV.aihubmixApiKey}` } }).catch(() => undefined);
  }
}

async function generateAudio(input: { prompt: string; model?: string }): Promise<GeneratedAIHubMixMedia> {
  const model = configuredModel("audio", input.model);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl()}/audio/speech`, { method: "POST", headers: authorizationHeaders(), body: JSON.stringify({ model, input: prompt(input.prompt, 4_096), voice: ENV.aihubmixAudioVoice, response_format: "mp3" }), signal: controller.signal });
    if (!response.ok) throw new AIHubMixMediaError("PROVIDER_ERROR", "AIHubMix audio generation failed. Please retry shortly.");
    return { kind: "audio", provider: "aihubmix", model, interactionId: response.headers.get("x-request-id"), mimeType: contentType("audio", response.headers.get("content-type")), bytes: assertBytes("audio", Buffer.from(await response.arrayBuffer())) };
  } catch (error) {
    if (error instanceof AIHubMixMediaError) throw error;
    const errorCategory = transportErrorCategory(error);
    logger.warn({ event: "aihubmix_audio_transport_error", errorCategory }, "AIHubMix audio transport failed");
    throw new AIHubMixMediaError("PROVIDER_ERROR", errorCategory === "timeout" ? "AIHubMix audio generation timed out. Please retry shortly." : "AIHubMix audio generation could not be reached. Please retry shortly.");
  } finally { clearTimeout(timeout); }
}

export const generateAIHubMixImage = generateImage;
export const generateAIHubMixVideo = generateVideo;
export const generateAIHubMixAudio = generateAudio;
