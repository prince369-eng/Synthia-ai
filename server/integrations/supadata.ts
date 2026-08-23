import { appendTaskEvent, createDeliverable } from "../db";
import { ENV } from "../_core/env";
import { getTaskArtifactUrl, putTaskArtifact } from "../agent/artifactStorage";
import { assertPublicWebDestination } from "../agent/publicWebPolicy";
import { enforceRateLimit, RateLimitError } from "../security/rateLimit";
import { logger } from "../security/logger";

const SUPADATA_BASE_URL = "https://api.supadata.ai/v1";
const MAX_PROMPT_LENGTH = 4_000;
const MAX_RESULT_BYTES = 512 * 1024;
const MAX_POLLS = 40;
const POLL_INTERVAL_MS = 1_000;
const SUPPORTED_FILE_EXTENSIONS = /\.(?:mp4|webm|mp3|flac|mpeg|m4a|ogg|wav)$/i;

export class SupadataRequestError extends Error {
  constructor(public readonly code: "CONFIGURATION_REQUIRED" | "INVALID_URL" | "RATE_LIMITED" | "PROVIDER_FAILED", message: string) {
    super(message);
  }
}

function supportedPublicVideoUrl(destination: URL) {
  const hostname = destination.hostname.toLowerCase();
  const platformHosts = ["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com", "fb.watch", "x.com", "twitter.com"];
  return platformHosts.some(host => hostname === host || hostname.endsWith(`.${host}`)) || SUPPORTED_FILE_EXTENSIONS.test(destination.pathname);
}

function boundedArtifact(value: unknown) {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") <= MAX_RESULT_BYTES) return serialized;
  return JSON.stringify({ truncated: true, message: "The provider result exceeded Synthia's safe artifact size limit." });
}

async function providerFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${SUPADATA_BASE_URL}${path}`, {
    ...init,
    headers: { "x-api-key": ENV.supadataApiKey, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new SupadataRequestError("PROVIDER_FAILED", "Public video understanding could not be completed.");
  return response;
}

/**
 * Runs only after the user starts a task. Classifying a task never invokes Supadata.
 * This uses Supadata's paid /extract route, so it is rate-limited, URL-guarded, and
 * deliberately unavailable without a server-side credential.
 */
export async function executeSupadataPublicVideoUnderstanding(input: { taskId: string; userId: number; sourceUrl: string; prompt: string }) {
  if (!ENV.supadataApiKey) throw new SupadataRequestError("CONFIGURATION_REQUIRED", "Public video understanding is unavailable until it is configured.");
  if (input.prompt.trim().length < 3 || input.prompt.length > MAX_PROMPT_LENGTH) {
    throw new SupadataRequestError("INVALID_URL", "The task instructions must be between 3 and 4,000 characters.");
  }
  const destination = await assertPublicWebDestination(input.sourceUrl);
  if (!supportedPublicVideoUrl(destination)) {
    throw new SupadataRequestError("INVALID_URL", "Use a public YouTube, TikTok, Instagram, Facebook, X, or supported media-file URL.");
  }
  try {
    await enforceRateLimit({ subject: String(input.userId), scope: "supadata-public-video", limit: 3, windowSeconds: 3_600 });
  } catch (error) {
    if (error instanceof RateLimitError) throw new SupadataRequestError("RATE_LIMITED", error.message);
    throw error;
  }

  await appendTaskEvent(input.taskId, { type: "tool_call", payload: { tool: "public_video_understanding", provider: "supadata", sourceHost: destination.hostname } });
  try {
    const createResponse = await providerFetch("/extract", {
      method: "POST",
      body: JSON.stringify({ url: destination.toString(), prompt: input.prompt }),
    });
    const created = await createResponse.json() as { jobId?: unknown };
    const jobId = typeof created.jobId === "string" && /^[a-zA-Z0-9-]{8,128}$/.test(created.jobId) ? created.jobId : null;
    if (!jobId) throw new SupadataRequestError("PROVIDER_FAILED", "Public video understanding could not be started.");

    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const resultResponse = await providerFetch(`/extract/${encodeURIComponent(jobId)}`, { method: "GET" });
      const result = await resultResponse.json() as { status?: unknown; data?: unknown; schema?: unknown };
      if (result.status === "completed") {
        const filename = `synthia-public-video-analysis-${Date.now()}.json`;
        const artifact = await putTaskArtifact({
          taskId: input.taskId,
          filename,
          body: Buffer.from(boundedArtifact({ sourceUrl: destination.toString(), data: result.data, schema: result.schema }), "utf8"),
          contentType: "application/json",
        });
        const event = await appendTaskEvent(input.taskId, { type: "tool_result", payload: { tool: "public_video_understanding", provider: "supadata", sourceHost: destination.hostname, storageKey: artifact.key } });
        const deliverableId = await createDeliverable({ taskId: input.taskId, eventId: event.id, filename, fileType: "application/json", storageKey: artifact.key, storageUrl: artifact.url, isFinal: false });
        logger.info({ event: "supadata_public_video_completed", taskId: input.taskId, userId: input.userId, deliverableId }, "Public video understanding completed");
        return { deliverableId, filename };
      }
      if (result.status === "failed") throw new SupadataRequestError("PROVIDER_FAILED", "Public video understanding could not be completed.");
    }
    throw new SupadataRequestError("PROVIDER_FAILED", "Public video understanding timed out. Try a shorter public video.");
  } catch (error) {
    const safeError = error instanceof SupadataRequestError
      ? error
      : new SupadataRequestError("PROVIDER_FAILED", "Public video understanding could not be completed. Try again shortly.");
    await appendTaskEvent(input.taskId, { type: "error", payload: { code: safeError.code, message: safeError.message } });
    logger.error({ event: "supadata_public_video_failed", taskId: input.taskId, userId: input.userId, errorKind: error instanceof Error ? error.name : "unknown" }, "Public video understanding failed");
    throw safeError;
  }
}
