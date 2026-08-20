import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { parse as parseCookieHeader } from "cookie";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  appendTaskEvent,
  clearSessionPersonalizationMemories,
  createPersonalizationMemory,
  createDeliverable,
  createProjectForUser,
  createTaskForUser,
  completeOnboardingForUser,
  DEFAULT_AUTONOMY_SETTINGS,
  type TaskPlanStep,
  getLibraryDeliverableForUser,
  getTaskForUser,
  getPersonalizationProfile,
  getProjectForUser,
  getUserPreferences,
  getUsageSummary,
  listIntegrationsForUser,
  listLibraryDeliverablesForUser,
  listMemoryFacts,
  listPersonalizationMemories,
  listProjectsForUser,
  listTaskApprovals,
  listTaskAttachments,
  listTaskDeliverables,
  listTaskEvents,
  listTaskMessages,
  listTaskSandboxes,
  listTasksForUser,
  recordUserMessage,
  resolveApprovalForTask,
  softDeleteTaskForUser,
  updateTaskForUser,
  updateUserPreferences,
  updatePersonalizationMemory,
  updatePersonalizationProfile,
  updateMemoryFactStatus,
  deletePersonalizationMemory,
  deleteIntegrationForUser,
  createIntegrationForUser,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { enqueueTaskCycle, isQueueConfigured } from "./agent/queue";
import { enforceRateLimit, RateLimitError } from "./security/rateLimit";
import { serviceReadinessForUser } from "./integrations/catalog";
import { estimateTaskCredits } from "./agent/creditEstimate";
import { encryptSecret } from "./security/encryption";
import { getTaskArtifactUrl, putTaskArtifact } from "./agent/artifactStorage";
import { listHeartbeatJobs } from "./_core/heartbeat";
import { storageGetSignedUrl, storagePut } from "./storage";
import { ENV } from "./_core/env";
import { mediaReadiness } from "./mediaCapabilities";
import { generateGeminiImage, generateGeminiVideo, GeminiMediaError, type GeminiMediaReference } from "./media/gemini";
import { generatePixazoAudio, generatePixazoImage, generatePixazoVideo, PixazoMediaError } from "./media/pixazo";
import { AIHubMixMediaError, generateAIHubMixAudio, generateAIHubMixImage, generateAIHubMixVideo } from "./media/aihubmix";
import { logger } from "./security/logger";
import { transcribeAudio } from "./_core/voiceTranscription";
import { runtimeConfiguredComposerModels } from "./agent/modelCatalog";

const taskIdSchema = z.object({ taskId: z.string().uuid() });
const taskTitleSchema = z.string().trim().min(1).max(180);
const taskStatusSchema = z.enum([
  "queued",
  "booting",
  "planning",
  "running",
  "needs_input",
  "paused",
  "completed",
  "failed",
  "cancelled",
]);

const planSchema = z.array(
  z.object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(240),
    state: z.enum(["pending", "active", "done", "blocked"]),
  }),
).min(1).max(25);

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_BASE64_LENGTH = Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4;
const MAX_VOICE_BYTES = 16 * 1024 * 1024;
const MAX_VOICE_BASE64_LENGTH = Math.ceil(MAX_VOICE_BYTES / 3) * 4;
const llmProviderSchema = z.enum(["groq", "agnes", "aihubmix", "openrouter", "gemini", "deepseek"]);
const selectedModelSchema = z.object({
  provider: llmProviderSchema,
  model: z.string().trim().min(1).max(180),
});
const personalityDimensionsSchema = z.object({
  warmth: z.number().int().min(0).max(100),
  directness: z.number().int().min(0).max(100),
  detail: z.number().int().min(0).max(100),
  creativity: z.number().int().min(0).max(100),
  initiative: z.number().int().min(0).max(100),
});
const voiceMimeSchema = z.enum(["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"]);
const mediaGenerationSchema = taskIdSchema.extend({
  kind: z.enum(["image", "video", "audio"]),
  provider: z.enum(["gemini", "pixazo", "aihubmix"]).optional(),
  prompt: z.string().trim().min(3).max(4_000),
  model: z.string().trim().min(1).max(180).optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
  referenceAttachmentId: z.string().uuid().optional(),
});
export const attachmentMimeSchema = z.string().trim().min(3).max(100).regex(
  /^(application\/(pdf|json|zip|x-7z-compressed|x-tar|vnd\.(openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|ms-excel|msword))|text\/(plain|csv|markdown)|image\/(png|jpeg|webp)|video\/(mp4|webm|quicktime))$/,
  "This file type is not supported.",
);
const attachmentReferenceSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("upload"),
    filename: z.string().trim().min(1).max(255),
    fileType: attachmentMimeSchema,
    storageKey: z.string().trim().min(1).max(1024),
    storageUrl: z.string().trim().min(1).max(2048),
  }),
  z.object({
    sourceType: z.literal("library"),
    sourceDeliverableId: z.string().uuid(),
  }),
]);

function safeAttachmentFilename(value: string) {
  const cleaned = value.replace(/[\\/\u0000-\u001f:*?"<>|]/g, "_").replace(/^\.+/, "").trim().slice(0, 240);
  if (!cleaned) throw new TRPCError({ code: "BAD_REQUEST", message: "A valid attachment filename is required." });
  return cleaned;
}

function decodeAttachmentBase64(value: string) {
  if (value.length === 0 || value.length > MAX_ATTACHMENT_BASE64_LENGTH || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The attachment payload is invalid or exceeds 10 MB." });
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.length > MAX_ATTACHMENT_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The attachment payload is invalid or exceeds 10 MB." });
  }
  return bytes;
}

function decodeVoiceBase64(value: string) {
  if (value.length === 0 || value.length > MAX_VOICE_BASE64_LENGTH || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The voice recording is invalid or exceeds 16 MB." });
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.length > MAX_VOICE_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The voice recording is invalid or exceeds 16 MB." });
  }
  return bytes;
}

function requestOrigin(request: { protocol: string; get(name: string): string | undefined; headers: Record<string, string | string[] | undefined> }) {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)?.split(",")[0]?.trim() || request.protocol;
  const host = request.get("host");
  if (!host) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The transcription service could not determine the storage origin." });
  return `${protocol}://${host}`;
}

function toNotFound(taskId: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message: `Task ${taskId} was not found.` });
}

async function requireOwnedTask(taskId: string, userId: number) {
  const task = await getTaskForUser(taskId, userId);
  if (!task) toNotFound(taskId);
  return task;
}

async function requireOwnedProject(projectId: string, userId: number) {
  const project = await getProjectForUser(projectId, userId);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Project ${projectId} was not found.` });
  }
  return project;
}

async function imageReferenceForTask(taskId: string, attachmentId: string | undefined): Promise<GeminiMediaReference | undefined> {
  if (!attachmentId) return undefined;
  const attachment = (await listTaskAttachments(taskId)).find(item => item.id === attachmentId);
  if (!attachment) throw new TRPCError({ code: "NOT_FOUND", message: "The selected task image was not found." });
  if (!["image/png", "image/jpeg", "image/webp"].includes(attachment.fileType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only PNG, JPEG, and WebP task attachments can be used as generation references." });
  }
  let response: Response;
  try {
    response = await fetch(await storageGetSignedUrl(attachment.storageKey));
  } catch (error) {
    logger.warn({ event: "media_reference_download_failed", taskId, attachmentId, error: error instanceof Error ? error.message : "unknown" }, "Task image reference retrieval failed");
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The selected task image could not be retrieved securely." });
  }
  if (!response.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The selected task image could not be retrieved securely." });
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length === 0 || data.length > 10 * 1024 * 1024) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The selected task image is invalid or exceeds the 10 MB reference limit." });
  }
  return { data, mimeType: attachment.fileType as GeminiMediaReference["mimeType"] };
}

function titleFromGoal(goal: string) {
  const normalized = goal.replace(/\s+/g, " ").trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}…` : normalized;
}

function initialPlanFromGoal(goal: string): TaskPlanStep[] {
  return [
    { id: "analyze", title: "Analyze the objective and constraints", state: "active" },
    { id: "execute", title: `Execute: ${titleFromGoal(goal)}`, state: "pending" },
    { id: "deliver", title: "Verify results and prepare deliverables", state: "pending" },
  ];
}

function userSessionFromRequest(cookieHeader: string | undefined): string {
  return parseCookieHeader(cookieHeader ?? "")[COOKIE_NAME] ?? "";
}

async function enforceUserMutationLimit(userId: number, scope: string, limit: number, windowSeconds: number) {
  try {
    await enforceRateLimit({ subject: String(userId), scope, limit, windowSeconds });
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: error.message });
    }
    throw error;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  projects: router({
    list: protectedProcedure.query(({ ctx }) => listProjectsForUser(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(2_000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "project-create", 30, 3_600);
        return createProjectForUser({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || undefined,
        });
      }),
  }),
  scheduled: router({
    list: protectedProcedure.query(({ ctx }) =>
      listHeartbeatJobs(userSessionFromRequest(ctx.req.headers.cookie), { page: 1, pageSize: 50 }),
    ),
  }),
  library: router({
    list: protectedProcedure.query(({ ctx }) => listLibraryDeliverablesForUser(ctx.user.id)),
  }),
  tasks: router({
    list: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => listTasksForUser(ctx.user.id, input?.includeArchived)),
    get: protectedProcedure.input(taskIdSchema).query(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.taskId, ctx.user.id);
      const [events, messages, approvals, deliverables, attachments, sandboxRows] = await Promise.all([
        listTaskEvents(task.id),
        listTaskMessages(task.id),
        listTaskApprovals(task.id),
        listTaskDeliverables(task.id),
        listTaskAttachments(task.id),
        listTaskSandboxes(task.id),
      ]);
      return { task, events, messages, approvals, deliverables, attachments, sandboxes: sandboxRows };
    }),
    artifactUrl: protectedProcedure
      .input(taskIdSchema.extend({ deliverableId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const task = await requireOwnedTask(input.taskId, ctx.user.id);
        const deliverable = (await listTaskDeliverables(task.id)).find(item => item.id === input.deliverableId);
        if (!deliverable) {
          throw new TRPCError({ code: "NOT_FOUND", message: "The requested task deliverable was not found." });
        }
        return {
          filename: deliverable.filename,
          fileType: deliverable.fileType,
          url: await getTaskArtifactUrl(deliverable.storageKey),
      };
    }),
    generateMedia: protectedProcedure.input(mediaGenerationSchema).mutation(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.taskId, ctx.user.id);
      await enforceUserMutationLimit(ctx.user.id, `media-generation-${input.kind}`, input.kind === "image" ? 8 : 3, 600);
      const reference = input.kind === "audio" ? undefined : await imageReferenceForTask(task.id, input.referenceAttachmentId);
      const configuredProvider = input.kind === "image" ? ENV.imageProvider : input.kind === "video" ? ENV.videoProvider : ENV.audioProvider;
      const provider = input.provider ?? (configuredProvider === "pixazo" || configuredProvider === "aihubmix" ? configuredProvider : "gemini");
      await appendTaskEvent(task.id, {
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
              ? await generatePixazoImage({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | undefined, referenceAttached: Boolean(reference) })
              : await generatePixazoVideo({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9", referenceAttached: Boolean(reference) })
          : input.kind === "audio"
            ? (() => { throw new GeminiMediaError("CONFIGURATION_REQUIRED", "Configure AIHubMix audio generation before requesting a task audio artifact."); })()
            : input.kind === "image"
            ? await generateGeminiImage({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | undefined, reference })
            : await generateGeminiVideo({ prompt: input.prompt, model: input.model, aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9", reference });
        const extension = generated.mimeType === "image/jpeg" ? "jpg" : generated.mimeType === "image/webp" ? "webp" : generated.mimeType === "audio/mpeg" ? "mp3" : generated.mimeType === "audio/wav" ? "wav" : generated.mimeType === "audio/ogg" ? "ogg" : generated.mimeType === "audio/aac" ? "aac" : generated.mimeType === "audio/flac" ? "flac" : generated.kind === "video" ? "mp4" : "png";
        const filename = `synthia-${generated.kind}-${Date.now()}.${extension}`;
        const artifact = await putTaskArtifact({ taskId: task.id, filename, body: generated.bytes, contentType: generated.mimeType });
        const event = await appendTaskEvent(task.id, {
          type: "tool_result",
          payload: {
            tool: `${provider}_media_generation`,
            kind: generated.kind,
            provider: generated.provider,
            model: generated.model,
            interactionId: generated.interactionId,
            storageKey: artifact.key,
          },
        });
        const deliverableId = await createDeliverable({
          taskId: task.id,
          eventId: event.id,
          filename,
          fileType: generated.mimeType,
          storageKey: artifact.key,
          storageUrl: artifact.url,
          isFinal: false,
        });
        logger.info({ event: "media_generation_completed", provider, taskId: task.id, userId: ctx.user.id, kind: generated.kind, model: generated.model, deliverableId }, "Media generation completed");
        return { deliverableId, filename, fileType: generated.mimeType, provider: generated.provider, model: generated.model };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Media generation failed.";
        const mediaError = error instanceof GeminiMediaError || error instanceof PixazoMediaError || error instanceof AIHubMixMediaError ? error : null;
        await appendTaskEvent(task.id, { type: "error", payload: { code: mediaError?.code ?? "MEDIA_GENERATION_FAILED", message } });
        if (mediaError?.code === "CONFIGURATION_REQUIRED") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message });
        }
        if (mediaError?.code === "INVALID_REQUEST") {
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }
        logger.error({ event: "media_generation_failed", provider, taskId: task.id, userId: ctx.user.id, kind: input.kind, error: message }, "Media generation failed");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Media generation could not be completed. Please retry shortly." });
      }
    }),
    rename: protectedProcedure.input(taskIdSchema.extend({ title: taskTitleSchema })).mutation(async ({ ctx, input }) => {
      const updated = await updateTaskForUser(input.taskId, ctx.user.id, { title: input.title });
      if (!updated) toNotFound(input.taskId);
      await appendTaskEvent(input.taskId, { type: "task_metadata", payload: { action: "renamed", title: input.title } });
      return updated;
    }),
    setPinned: protectedProcedure.input(taskIdSchema.extend({ isPinned: z.boolean() })).mutation(async ({ ctx, input }) => {
      const updated = await updateTaskForUser(input.taskId, ctx.user.id, { isPinned: input.isPinned });
      if (!updated) toNotFound(input.taskId);
      await appendTaskEvent(input.taskId, { type: "task_metadata", payload: { action: input.isPinned ? "pinned" : "unpinned" } });
      return updated;
    }),
    setFavorite: protectedProcedure.input(taskIdSchema.extend({ isFavorite: z.boolean() })).mutation(async ({ ctx, input }) => {
      const updated = await updateTaskForUser(input.taskId, ctx.user.id, { isFavorite: input.isFavorite });
      if (!updated) toNotFound(input.taskId);
      await appendTaskEvent(input.taskId, { type: "task_metadata", payload: { action: input.isFavorite ? "favorited" : "unfavorited" } });
      return updated;
    }),
    setArchived: protectedProcedure.input(taskIdSchema.extend({ isArchived: z.boolean() })).mutation(async ({ ctx, input }) => {
      const updated = await updateTaskForUser(input.taskId, ctx.user.id, {
        isArchived: input.isArchived,
        archivedAt: input.isArchived ? new Date() : null,
      });
      if (!updated) toNotFound(input.taskId);
      await appendTaskEvent(input.taskId, { type: "task_metadata", payload: { action: input.isArchived ? "archived" : "unarchived" } });
      return updated;
    }),
    delete: protectedProcedure.input(taskIdSchema).mutation(async ({ ctx, input }) => {
      await requireOwnedTask(input.taskId, ctx.user.id);
      await softDeleteTaskForUser(input.taskId, ctx.user.id);
      await appendTaskEvent(input.taskId, { type: "task_metadata", payload: { action: "deleted" } });
      return { ok: true };
    }),
    uploadAttachment: protectedProcedure
      .input(z.object({
        filename: z.string().trim().min(1).max(255),
        contentType: attachmentMimeSchema,
        dataBase64: z.string().min(1).max(MAX_ATTACHMENT_BASE64_LENGTH),
      }))
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "task-attachment-upload", 20, 3_600);
        const filename = safeAttachmentFilename(input.filename);
        const bytes = decodeAttachmentBase64(input.dataBase64);
        try {
          const stored = await storagePut(`task-inputs/${ctx.user.id}/${randomUUID()}-${filename}`, bytes, input.contentType);
          return { storageKey: stored.key, storageUrl: stored.url, filename, fileType: input.contentType };
        } catch (error) {
          console.error(JSON.stringify({ event: "task_attachment_upload_failed", userId: ctx.user.id, filename, message: error instanceof Error ? error.message : "unknown" }));
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The attachment could not be stored." });
        }
      }),
    transcribeVoice: protectedProcedure
      .input(z.object({
        filename: z.string().trim().min(1).max(255),
        contentType: voiceMimeSchema,
        dataBase64: z.string().min(1).max(MAX_VOICE_BASE64_LENGTH),
      }))
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "task-voice-transcription", 12, 3_600);
        const filename = safeAttachmentFilename(input.filename);
        const bytes = decodeVoiceBase64(input.dataBase64);
        try {
          const stored = await storagePut(`voice-inputs/${ctx.user.id}/${randomUUID()}-${filename}`, bytes, input.contentType);
          const origin = ENV.publicAppUrl.replace(/\/$/, "") || requestOrigin(ctx.req);
          const result = await transcribeAudio({
            audioUrl: stored.url.startsWith("http") ? stored.url : `${origin}${stored.url}`,
            prompt: "Transcribe this task instruction accurately.",
          });
          if ("error" in result) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
          return { text: result.text, language: result.language, duration: result.duration };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error(JSON.stringify({ event: "task_voice_transcription_failed", userId: ctx.user.id, message: error instanceof Error ? error.message : "unknown" }));
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The voice recording could not be transcribed." });
        }
      }),
    create: protectedProcedure
      .input(
        z.object({
          goal: z.string().trim().min(8).max(12_000),
          title: z.string().trim().min(1).max(180).optional(),
          projectId: z.string().uuid().optional(),
          plan: planSchema.optional(),
          autonomySettings: z.object({
            mode: z.enum(["ask_before_risky", "supervised"]),
            allowWebSearch: z.boolean(),
            allowCodeExecution: z.boolean(),
            allowFileWrites: z.boolean(),
            selectedModel: selectedModelSchema.optional(),
          }).default(DEFAULT_AUTONOMY_SETTINGS),
          involvesCode: z.boolean(),
          attachments: z.array(attachmentReferenceSchema).max(12).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "task-create", 12, 3_600);
        if (input.autonomySettings.selectedModel && !runtimeConfiguredComposerModels().some(model => model.id === `${input.autonomySettings.selectedModel!.provider}:${input.autonomySettings.selectedModel!.model}`)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "The selected model is not configured for this workspace." });
        }
        if (input.projectId) await requireOwnedProject(input.projectId, ctx.user.id);
        const attachments = await Promise.all((input.attachments ?? []).map(async attachment => {
          if (attachment.sourceType === "upload") {
            if (!attachment.storageKey.startsWith(`task-inputs/${ctx.user.id}/`) || !attachment.storageUrl.startsWith("/manus-storage/")) {
              throw new TRPCError({ code: "FORBIDDEN", message: "The uploaded attachment is not available to this account." });
            }
            return attachment;
          }
          const deliverable = await getLibraryDeliverableForUser(attachment.sourceDeliverableId, ctx.user.id);
          if (!deliverable) throw new TRPCError({ code: "NOT_FOUND", message: "The selected Library file was not found." });
          return {
            filename: deliverable.filename,
            fileType: deliverable.fileType,
            storageKey: deliverable.storageKey,
            storageUrl: deliverable.storageUrl,
            sourceType: "library" as const,
            sourceDeliverableId: deliverable.id,
          };
        }));
        const plan = input.plan ?? initialPlanFromGoal(input.goal);
        const estimate = estimateTaskCredits({ goal: input.goal, planSteps: plan.length, involvesCode: input.involvesCode });
        const task = await createTaskForUser({
          userId: ctx.user.id,
          projectId: input.projectId,
          title: input.title ?? titleFromGoal(input.goal),
          goal: input.goal,
          plan,
          autonomySettings: input.autonomySettings,
          involvesCode: input.involvesCode,
          attachments,
          ...estimate,
        });
        if (!task) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The task could not be created." });
        }
        const executionQueued = await enqueueTaskCycle(task.id);
        return { task, executionQueued };
      }),
    addMessage: protectedProcedure
      .input(taskIdSchema.extend({ content: z.string().trim().min(1).max(12_000) }))
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "task-message", 60, 3_600);
        const task = await requireOwnedTask(input.taskId, ctx.user.id);
        if (["completed", "failed", "cancelled"].includes(task.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A message cannot be added to a closed task." });
        }
        return recordUserMessage(task.id, input.content);
      }),
    pause: protectedProcedure.input(taskIdSchema).mutation(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.taskId, ctx.user.id);
      if (!["queued", "booting", "planning", "running"].includes(task.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only an active task may be paused." });
      }
      await updateTaskForUser(task.id, ctx.user.id, { status: "paused", currentStepSummary: "Paused by user." });
      await appendTaskEvent(task.id, { type: "status_change", payload: { status: "paused", summary: "Paused by user." } });
      return { success: true };
    }),
    resume: protectedProcedure.input(taskIdSchema).mutation(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.taskId, ctx.user.id);
      if (!["paused", "needs_input"].includes(task.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only a paused or input-blocked task may be resumed." });
      }
      await updateTaskForUser(task.id, ctx.user.id, { status: "queued", currentStepSummary: "Queued for continuation." });
      await appendTaskEvent(task.id, { type: "status_change", payload: { status: "queued", summary: "Queued for continuation." } });
      return { success: true, executionQueued: await enqueueTaskCycle(task.id) };
    }),
    cancel: protectedProcedure.input(taskIdSchema).mutation(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.taskId, ctx.user.id);
      if (["completed", "failed", "cancelled"].includes(task.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The task is already closed." });
      }
      await updateTaskForUser(task.id, ctx.user.id, { status: "cancelled", currentStepSummary: "Cancelled by user." });
      await appendTaskEvent(task.id, { type: "status_change", payload: { status: "cancelled", summary: "Cancelled by user." } });
      return { success: true };
    }),
    pin: protectedProcedure
      .input(taskIdSchema.extend({ isPinned: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await requireOwnedTask(input.taskId, ctx.user.id);
        await updateTaskForUser(input.taskId, ctx.user.id, { isPinned: input.isPinned });
        return { success: true };
      }),
    updatePlan: protectedProcedure
      .input(taskIdSchema.extend({ plan: planSchema }))
      .mutation(async ({ ctx, input }) => {
        const task = await requireOwnedTask(input.taskId, ctx.user.id);
        if (["completed", "failed", "cancelled"].includes(task.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "The plan cannot be changed after a task closes." });
        }
        await updateTaskForUser(task.id, ctx.user.id, { plan: input.plan });
        return appendTaskEvent(task.id, { type: "plan_update", payload: { plan: input.plan, source: "user" } });
      }),
  }),
  approvals: router({
    resolve: protectedProcedure
      .input(
        z.object({
          taskId: z.string().uuid(),
          approvalId: z.string().uuid(),
          decision: z.enum(["approved", "rejected", "edited"]),
          resolvedInput: z.record(z.string(), z.unknown()).optional(),
        }).superRefine((value, context) => {
          if (value.decision === "edited" && !value.resolvedInput) {
            context.addIssue({ code: "custom", message: "Edited approvals require a replacement input.", path: ["resolvedInput"] });
          }
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "approval", 30, 3_600);
        await requireOwnedTask(input.taskId, ctx.user.id);
        const event = await resolveApprovalForTask(input);
        if (input.decision !== "rejected") {
          await updateTaskForUser(input.taskId, ctx.user.id, { status: "queued", currentStepSummary: "Approval received; queued for continuation." });
          await appendTaskEvent(input.taskId, { type: "status_change", payload: { status: "queued", summary: "Approval received; queued for continuation." } });
        }
        return { event, executionQueued: input.decision !== "rejected" ? await enqueueTaskCycle(input.taskId) : false };
      }),
  }),
  workspace: router({
    usage: protectedProcedure.query(({ ctx }) => getUsageSummary(ctx.user.id)),
    memory: protectedProcedure.query(({ ctx }) => listMemoryFacts(ctx.user.id)),
    integrations: protectedProcedure.query(({ ctx }) => listIntegrationsForUser(ctx.user.id)),
    serviceReadiness: protectedProcedure.query(async ({ ctx }) => serviceReadinessForUser(await listIntegrationsForUser(ctx.user.id))),
  }),
  settings: router({
    get: protectedProcedure.query(({ ctx }) => getUserPreferences(ctx.user.id)),
    updatePreferences: protectedProcedure
      .input(z.object({ preferences: z.record(z.string(), z.unknown()).refine(value => JSON.stringify(value).length <= 32_000, "Preferences are too large.") }))
      .mutation(({ ctx, input }) => updateUserPreferences(ctx.user.id, input.preferences)),
    completeOnboarding: protectedProcedure.mutation(({ ctx }) => completeOnboardingForUser(ctx.user.id)),
  }),
  personalization: router({
    profile: protectedProcedure.query(({ ctx }) => getPersonalizationProfile(ctx.user.id)),
    updateProfile: protectedProcedure
      .input(z.object({
        dimensions: personalityDimensionsSchema,
        enabled: z.boolean(),
        sessionMemoryEnabled: z.boolean(),
        longTermMemoryEnabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "personalization-profile", 30, 3_600);
        return updatePersonalizationProfile({ userId: ctx.user.id, ...input });
      }),
    memories: protectedProcedure.query(({ ctx }) => listPersonalizationMemories(ctx.user.id)),
    addMemory: protectedProcedure
      .input(z.object({
        memoryType: z.enum(["session", "long_term"]),
        content: z.string().trim().min(1).max(1_200),
        sessionExpiresInHours: z.number().int().min(1).max(168).optional(),
      }).superRefine((value, issue) => {
        if (value.memoryType === "long_term" && value.sessionExpiresInHours !== undefined) {
          issue.addIssue({ code: "custom", path: ["sessionExpiresInHours"], message: "Long-term memories cannot have a session expiry." });
        }
      }))
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "personalization-memory", 60, 3_600);
        const expiresAt = input.memoryType === "session"
          ? new Date(Date.now() + (input.sessionExpiresInHours ?? 24) * 60 * 60 * 1_000)
          : undefined;
        const id = await createPersonalizationMemory({ userId: ctx.user.id, memoryType: input.memoryType, content: input.content, expiresAt });
        return { id };
      }),
    updateMemory: protectedProcedure
      .input(z.object({ id: z.string().uuid(), content: z.string().trim().min(1).max(1_200), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "personalization-memory", 60, 3_600);
        await updatePersonalizationMemory({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
    deleteMemory: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await deletePersonalizationMemory(input.id, ctx.user.id);
        return { success: true };
      }),
    clearSession: protectedProcedure.mutation(async ({ ctx }) => {
      await clearSessionPersonalizationMemories(ctx.user.id);
      return { success: true };
    }),
  }),
  memory: router({
    archive: protectedProcedure
      .input(z.object({ memoryId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await updateMemoryFactStatus({ memoryId: input.memoryId, userId: ctx.user.id, status: "archived" });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ memoryId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await updateMemoryFactStatus({ memoryId: input.memoryId, userId: ctx.user.id, status: "user_deleted" });
        return { success: true };
      }),
  }),
  integrations: router({
    save: protectedProcedure
      .input(z.object({
        provider: z.string().trim().min(2).max(64).regex(/^[a-z0-9_-]+$/i),
        label: z.string().trim().min(1).max(120),
        accessToken: z.string().min(1).max(16_000),
        refreshToken: z.string().max(16_000).optional(),
        scopes: z.array(z.string().trim().min(1).max(120)).max(100),
        availableToAllTasks: z.boolean(),
        expiresAt: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createIntegrationForUser({
          userId: ctx.user.id,
          provider: input.provider.toLowerCase(),
          label: input.label,
          encryptedAccessToken: encryptSecret(input.accessToken),
          encryptedRefreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : undefined,
          scopes: input.scopes,
          availableToAllTasks: input.availableToAllTasks,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        });
        return { id };
      }),
    remove: protectedProcedure
      .input(z.object({ integrationId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await deleteIntegrationForUser(input.integrationId, ctx.user.id);
        return { success: true };
      }),
  }),
  catalog: router({
    taskStatuses: publicProcedure.query(() => taskStatusSchema.options),
    executionReadiness: protectedProcedure.query(() => ({ queueConfigured: isQueueConfigured() })),
    models: protectedProcedure.query(() => ({
      models: runtimeConfiguredComposerModels(),
      input: {
        text: true,
        voice: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
        vision: runtimeConfiguredComposerModels().some(model => model.capabilities.includes("vision")),
      },
    })),
    media: protectedProcedure.query(() => mediaReadiness(ENV)),
    estimateTask: protectedProcedure
      .input(z.object({ goal: z.string().trim().min(8).max(12_000), planSteps: z.number().int().min(1).max(25), involvesCode: z.boolean() }))
      .query(({ input }) => estimateTaskCredits(input)),
  }),
});

export type AppRouter = typeof appRouter;
