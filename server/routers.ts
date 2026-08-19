import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  appendTaskEvent,
  createTaskForUser,
  completeOnboardingForUser,
  DEFAULT_AUTONOMY_SETTINGS,
  type TaskPlanStep,
  getTaskForUser,
  getUserPreferences,
  getUsageSummary,
  listIntegrationsForUser,
  listMemoryFacts,
  listTaskApprovals,
  listTaskDeliverables,
  listTaskEvents,
  listTaskMessages,
  listTaskSandboxes,
  listTasksForUser,
  recordUserMessage,
  resolveApprovalForTask,
  updateTaskForUser,
  updateUserPreferences,
  updateMemoryFactStatus,
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
import { getTaskArtifactUrl } from "./agent/artifactStorage";

const taskIdSchema = z.object({ taskId: z.string().uuid() });
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

function toNotFound(taskId: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message: `Task ${taskId} was not found.` });
}

async function requireOwnedTask(taskId: string, userId: number) {
  const task = await getTaskForUser(taskId, userId);
  if (!task) toNotFound(taskId);
  return task;
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
  tasks: router({
    list: protectedProcedure.query(({ ctx }) => listTasksForUser(ctx.user.id)),
    get: protectedProcedure.input(taskIdSchema).query(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.taskId, ctx.user.id);
      const [events, messages, approvals, deliverables, sandboxRows] = await Promise.all([
        listTaskEvents(task.id),
        listTaskMessages(task.id),
        listTaskApprovals(task.id),
        listTaskDeliverables(task.id),
        listTaskSandboxes(task.id),
      ]);
      return { task, events, messages, approvals, deliverables, sandboxes: sandboxRows };
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
    create: protectedProcedure
      .input(
        z.object({
          goal: z.string().trim().min(8).max(12_000),
          title: z.string().trim().min(1).max(180).optional(),
          plan: planSchema.optional(),
          autonomySettings: z.object({
            mode: z.enum(["ask_before_risky", "supervised"]),
            allowWebSearch: z.boolean(),
            allowCodeExecution: z.boolean(),
            allowFileWrites: z.boolean(),
          }).default(DEFAULT_AUTONOMY_SETTINGS),
          involvesCode: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await enforceUserMutationLimit(ctx.user.id, "task-create", 12, 3_600);
        const plan = input.plan ?? initialPlanFromGoal(input.goal);
        const estimate = estimateTaskCredits({ goal: input.goal, planSteps: plan.length, involvesCode: input.involvesCode });
        const task = await createTaskForUser({
          userId: ctx.user.id,
          title: input.title ?? titleFromGoal(input.goal),
          goal: input.goal,
          plan,
          autonomySettings: input.autonomySettings,
          involvesCode: input.involvesCode,
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
    estimateTask: protectedProcedure
      .input(z.object({ goal: z.string().trim().min(8).max(12_000), planSteps: z.number().int().min(1).max(25), involvesCode: z.boolean() }))
      .query(({ input }) => estimateTaskCredits(input)),
  }),
});

export type AppRouter = typeof appRouter;
