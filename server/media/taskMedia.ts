import { appendTaskEvent, createDeliverable, listTaskAttachments } from "../db";
import { ENV } from "../_core/env";
import { storageGetSignedUrl } from "../storage";
import { getTaskArtifactUrl, putTaskArtifact } from "../agent/artifactStorage";
import { enforceRateLimit, RateLimitError } from "../security/rateLimit";
import { logger } from "../security/logger";
import { AIHubMixMediaError, generateAIHubMixAudio, generateAIHubMixImage, generateAIHubMixVideo } from "./aihubmix";
import { GeminiMediaError, generateGeminiImage, generateGeminiVideo, type GeminiMediaReference } from "./gemini";
import { generatePixazoAudio, generatePixazoImage, generatePixazoVideo, PixazoMediaError } from "./pixazo";

export type TaskMediaKind = "image" | "video" | "audio";
export type TaskMediaProvider = "gemini" | "pixazo" | "aihubmix";

export class TaskMediaRequestError extends Error {
  constructor(public readonly code: "INVALID_REQUEST" | "REFERENCE_NOT_FOUND" | "RATE_LIMITED", message: string) {
    super(message);
    this.name = "TaskMediaRequestError";
  }
}

function extensionFor(kind: TaskMediaKind, mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "audio/wav") return "wav";
  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType === "audio/aac") return "aac";
  if (mimeType === "audio/flac") return "flac";
  return kind === "video" ? "mp4" : "png";
}

async function imageReferenceForTask(taskId: string, attachmentId: string | undefined): Promise<GeminiMediaReference | undefined> {
  if (!attachmentId) return undefined;
  const attachment = (await listTaskAttachments(taskId)).find(item => item.id === attachmentId);
  if (!attachment) throw new TaskMediaRequestError("REFERENCE_NOT_FOUND", "The selected task image was not found.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(attachment.fileType)) {
    throw new TaskMediaRequestError("INVALID_REQUEST", "Only PNG, JPEG, and WebP task attachments can be used as generation references.");
  }
  let response: Response;
  try {
    response = await fetch(attachment.sourceType === "library" ? await getTaskArtifactUrl(attachment.storageKey) : await storageGetSignedUrl(attachment.storageKey));
  } catch (error) {
    const errorCategory = error instanceof TypeError ? "network" : "unknown";
    logger.warn({ event: "media_reference_download_failed", taskId, attachmentId, errorCategory }, "Task image reference retrieval failed");
    throw new Error("The selected task image could not be retrieved securely.");
  }
  if (!response.ok) throw new Error("The selected task image could not be retrieved securely.");
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length === 0 || data.length > 10 * 1024 * 1024) {
    throw new TaskMediaRequestError("INVALID_REQUEST", "The selected task image is invalid or exceeds the 10 MB reference limit.");
  }
  return { data, mimeType: attachment.fileType as GeminiMediaReference["mimeType"] };
}

function providerFor(kind: TaskMediaKind, requested: TaskMediaProvider | undefined): TaskMediaProvider {
  if (requested) return requested;
  const configured = kind === "image" ? ENV.imageProvider : kind === "video" ? ENV.videoProvider : ENV.audioProvider;
  return configured === "pixazo" || configured === "aihubmix" ? configured : "gemini";
}

export async function executeTaskMedia(input: {
  taskId: string;
  userId: number;
  kind: TaskMediaKind;
  prompt: string;
  provider?: TaskMediaProvider;
  model?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  referenceAttachmentId?: string;
}) {
  if (input.prompt.trim().length < 3 || input.prompt.length > 4_000) {
    throw new TaskMediaRequestError("INVALID_REQUEST", "The media prompt must be between 3 and 4,000 characters.");
  }
  try {
    await enforceRateLimit({ subject: String(input.userId), scope: `media-generation-${input.kind}`, limit: input.kind === "image" ? 8 : 3, windowSeconds: 600 });
  } catch (error) {
    if (error instanceof RateLimitError) throw new TaskMediaRequestError("RATE_LIMITED", error.message);
    throw error;
  }
  const provider = providerFor(input.kind, input.provider);
  const reference = input.kind === "audio" ? undefined : await imageReferenceForTask(input.taskId, input.referenceAttachmentId);
  await appendTaskEvent(input.taskId, {
    type: "tool_call",
    payload: { tool: `${provider}_media_generation`, provider, kind: input.kind, model: input.model ?? null, referenceAttachmentId: input.referenceAttachmentId ?? null },
  });
  try {
    const generated = provider === "aihubmix"
      ? input.kind === "image"
        ? await generateAIHubMixImage({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio, referenceAttached: Boolean(reference) })
        : input.kind === "video"
          ? await generateAIHubMixVideo({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9", referenceAttached: Boolean(reference) })
          : await generateAIHubMixAudio({ prompt: input.prompt, model: input.model })
      : provider === "pixazo"
        ? input.kind === "audio"
          ? await generatePixazoAudio({ prompt: input.prompt, model: input.model })
          : input.kind === "image"
            ? await generatePixazoImage({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio, referenceAttached: Boolean(reference) })
            : await generatePixazoVideo({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9", referenceAttached: Boolean(reference) })
        : input.kind === "audio"
          ? (() => { throw new GeminiMediaError("CONFIGURATION_REQUIRED", "Configure an audio-generation provider before requesting a task audio artifact."); })()
          : input.kind === "image"
            ? await generateGeminiImage({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio, reference })
            : await generateGeminiVideo({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9", reference });
    const filename = `synthia-${generated.kind}-${Date.now()}.${extensionFor(generated.kind, generated.mimeType)}`;
    const artifact = await putTaskArtifact({ taskId: input.taskId, filename, body: generated.bytes, contentType: generated.mimeType });
    const event = await appendTaskEvent(input.taskId, {
      type: "tool_result",
      payload: { tool: `${provider}_media_generation`, kind: generated.kind, provider: generated.provider, model: generated.model, interactionId: generated.interactionId, storageKey: artifact.key },
    });
    const deliverableId = await createDeliverable({ taskId: input.taskId, eventId: event.id, filename, fileType: generated.mimeType, storageKey: artifact.key, storageUrl: artifact.url, isFinal: false });
    logger.info({ event: "media_generation_completed", provider, taskId: input.taskId, userId: input.userId, kind: generated.kind, model: generated.model, deliverableId }, "Media generation completed");
    return { deliverableId, filename, fileType: generated.mimeType, provider: generated.provider, model: generated.model };
  } catch (error) {
    const mediaError = error instanceof GeminiMediaError || error instanceof PixazoMediaError || error instanceof AIHubMixMediaError ? error : null;
    const code = mediaError?.code ?? "MEDIA_GENERATION_FAILED";
    const message = mediaError?.message ?? "Media generation failed.";
    await appendTaskEvent(input.taskId, { type: "error", payload: { code, message } });
    logger.error({ event: "media_generation_failed", provider, taskId: input.taskId, userId: input.userId, kind: input.kind, errorCode: code }, "Media generation failed");
    throw error;
  }
}
