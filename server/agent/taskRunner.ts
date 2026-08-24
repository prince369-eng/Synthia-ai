import {
  type AutonomySettings,
  appendTaskEvent,
  cacheTaskSkillSelections,
  createApprovalForTask,
  createDeliverable,
  createSandboxForTask,
  getApprovedPersonalizationContext,
  listEnabledPolicyPacksForPlanning,
  getRecoverableSandboxForTask,
  getTaskSkillSelectionsForUser,
  getTaskById,
  getUserById,
  listTaskAttachments,
  listTaskApprovals,
  listTaskEvents,
  listEnabledSkillCandidatesForUser,
  recordAgentMessage,
  recordUsageForTask,
  restoreSandboxForTask,
  updateSandboxCheckpoint,
  updateTaskForWorker,
} from "../db";
import { ENV } from "../_core/env";
import { getTaskArtifactUrl, putTaskArtifact } from "./artifactStorage";
import { generateWithFallback, isConfiguredVisionModel, LlmRouteUnavailableError, LlmStructuredOutputError, parseStructuredModelOutput, type LlmContentPart } from "./llm";
import { evaluateActionPolicy, isAgentAction, type AgentAction } from "./policy";
import { enqueueTaskCycle } from "./queue";
import { sandboxProviderFor, createSandboxProvider, type SandboxDescriptor } from "./sandbox";
import { searchWeb } from "./search";
import { logger } from "../security/logger";
import { notifyTask } from "./notifications";
import { storageGetSignedUrl } from "../storage";
import { personalizationInstruction } from "./personalizationContext";
import { policyPackPlanningContext } from "./policyPackContext";
import { resolveAutomaticTaskModel } from "./automaticRouting";
import { runtimeConfiguredComposerModels } from "./modelCatalog";
import { executeTaskMedia } from "../media/taskMedia";
import { executeSupadataPublicVideoUnderstanding } from "../integrations/supadata";
import { rankSkillsForGoal, skillPlanningContext } from "./skillMatching";

type ModelDecision = {
  narration: string;
  action: AgentAction;
  plan?: Array<{ id: string; title: string; state: "pending" | "active" | "done" | "blocked" }>;
};

function taskContext(events: Awaited<ReturnType<typeof listTaskEvents>>) {
  return events.slice(-40).map(event => ({ sequence: event.sequenceNumber, type: event.type, payload: event.payload }));
}

function validatedDecision(value: unknown): ModelDecision {
  if (!value || typeof value !== "object") throw new LlmStructuredOutputError();
  const decision = value as Record<string, unknown>;
  if (typeof decision.narration !== "string" || decision.narration.trim().length === 0 || !isAgentAction(decision.action)) {
    throw new LlmStructuredOutputError();
  }
  return { narration: decision.narration.trim().slice(0, 8_000), action: decision.action, plan: Array.isArray(decision.plan) ? decision.plan as ModelDecision["plan"] : undefined };
}

async function resolveSandbox(taskId: string): Promise<{ dbSandboxId: string; descriptor: SandboxDescriptor }> {
  const existing = await getRecoverableSandboxForTask(taskId);
  if (existing?.providerSandboxId) {
    if (existing.status === "checkpointed" && existing.checkpointRef) {
      const restored = await sandboxProviderFor(existing.provider).restore(existing.checkpointRef);
      await restoreSandboxForTask(existing.id, restored.providerSandboxId);
      return { dbSandboxId: existing.id, descriptor: restored };
    }
    return {
      dbSandboxId: existing.id,
      descriptor: { provider: existing.provider, providerSandboxId: existing.providerSandboxId, region: existing.region, maxSessionSeconds: existing.maxSessionSeconds },
    };
  }
  const descriptor = await createSandboxProvider().create(taskId);
  const dbSandboxId = await createSandboxForTask({
    taskId,
    provider: descriptor.provider,
    region: descriptor.region,
    providerSandboxId: descriptor.providerSandboxId,
    maxSessionSeconds: descriptor.maxSessionSeconds,
  });
  return { dbSandboxId, descriptor };
}

async function checkpointSandbox(dbSandboxId: string, descriptor: SandboxDescriptor) {
  const checkpointRef = await sandboxProviderFor(descriptor.provider).checkpoint(descriptor);
  await updateSandboxCheckpoint(dbSandboxId, checkpointRef);
}

function safeInputPath(index: number, filename: string) {
  const sanitized = filename.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 160) || "attachment";
  return `/workspace/inputs/${String(index + 1).padStart(2, "0")}-${sanitized}`;
}

async function hydrateTaskAttachments(taskId: string, descriptor: SandboxDescriptor) {
  const attachments = await listTaskAttachments(taskId);
  if (!attachments.length) return [];
  const provider = sandboxProviderFor(descriptor.provider);
  const directory = await provider.execute(descriptor, "mkdir -p /workspace/inputs");
  if (directory.exitCode !== 0) throw new Error(directory.stderr || "The attachment workspace could not be prepared.");
  return Promise.all(attachments.map(async (attachment, index) => {
    const url = attachment.sourceType === "library"
      ? await getTaskArtifactUrl(attachment.storageKey)
      : await storageGetSignedUrl(attachment.storageKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`The attachment ${attachment.filename} could not be retrieved.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error(`The attachment ${attachment.filename} exceeds the task input limit.`);
    const path = safeInputPath(index, attachment.filename);
    await provider.writeFile(descriptor, { path, content: bytes });
    return { filename: attachment.filename, fileType: attachment.fileType, path };
  }));
}

async function taskModelInput(input: {
  title: string;
  goal: string;
  plan: unknown;
  events: ReturnType<typeof taskContext>;
  attachments: Awaited<ReturnType<typeof listTaskAttachments>>;
  selectedModel: AutonomySettings["selectedModel"];
}) {
  const text = JSON.stringify({
    title: input.title,
    goal: input.goal,
    plan: input.plan,
    attachments: input.attachments.map((attachment, index) => ({ filename: attachment.filename, fileType: attachment.fileType, path: safeInputPath(index, attachment.filename) })),
    events: input.events,
  });
  if (!isConfiguredVisionModel(input.selectedModel)) return text;
  const visualAttachments = input.attachments.filter(attachment => ["image/png", "image/jpeg", "image/webp"].includes(attachment.fileType)).slice(0, 4);
  if (!visualAttachments.length) return text;
  const visualParts = await Promise.all(visualAttachments.map(async attachment => {
    const url = attachment.sourceType === "library" ? await getTaskArtifactUrl(attachment.storageKey) : await storageGetSignedUrl(attachment.storageKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`The visual attachment ${attachment.filename} could not be retrieved.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 4 * 1024 * 1024) throw new Error(`The visual attachment ${attachment.filename} exceeds the 4 MB vision input limit.`);
    return { type: "image" as const, mimeType: attachment.fileType as "image/png" | "image/jpeg" | "image/webp", dataBase64: Buffer.from(bytes).toString("base64") } satisfies LlmContentPart;
  }));
  return [{ type: "text" as const, text }, ...visualParts] satisfies LlmContentPart[];
}

async function requireAutomaticMediaApproval(input: {
  taskId: string;
  kind: "image" | "video" | "audio" | "public_video";
  provider: string;
  model?: string;
  sourceUrl?: string;
}) {
  const toolName = `media.${input.kind}`;
  const approvals = await listTaskApprovals(input.taskId);
  const approval = approvals.find(item => item.toolName === toolName);
  if (approval?.status === "approved" || approval?.status === "edited") return false;
  if (approval?.status === "pending") {
    await updateTaskForWorker(input.taskId, { status: "needs_input", currentStepSummary: "Waiting for approval before a quota-consuming media request." });
    return true;
  }
  if (approval?.status === "rejected") {
    await updateTaskForWorker(input.taskId, { status: "needs_input", currentStepSummary: "The media request was declined. Update the task or request a new approval." });
    return true;
  }

  const event = await appendTaskEvent(input.taskId, {
    type: "approval_request",
    payload: { tool: toolName, provider: input.provider, model: input.model, kind: input.kind, quotaConsuming: true },
  });
  await createApprovalForTask({
    taskId: input.taskId,
    eventId: event.id,
    description: input.kind === "public_video"
      ? "Analyze the requested public video using a configured media service. This may consume provider quota."
      : `Generate the requested ${input.kind} using a configured media model. This may consume provider quota.`,
    riskLevel: "medium",
    toolName,
    toolInput: { provider: input.provider, model: input.model, kind: input.kind, sourceUrl: input.sourceUrl },
  });
  await updateTaskForWorker(input.taskId, { status: "needs_input", currentStepSummary: "Waiting for approval before a quota-consuming media request." });
  return true;
}

async function executeAction(taskId: string, action: AgentAction) {
  if (action.kind === "respond") {
    await recordAgentMessage(taskId, action.content);
    return { completed: false, summary: "Shared an update." };
  }
  if (action.kind === "web_search") {
    await appendTaskEvent(taskId, { type: "tool_call", payload: { tool: "web_search", query: action.query } });
    const result = await searchWeb(action.query);
    await appendTaskEvent(taskId, { type: "tool_result", payload: { tool: "web_search", ...result } });
    return { completed: false, summary: `Searched the web for: ${action.query}` };
  }
  if (action.kind === "complete") {
    await recordAgentMessage(taskId, action.summary);
    await updateTaskForWorker(taskId, { status: "completed", currentStepSummary: action.summary, completedAt: new Date() });
    await appendTaskEvent(taskId, { type: "status_change", payload: { status: "completed", summary: action.summary } });
    const user = await getUserById((await getTaskById(taskId))!.userId);
    await notifyTask({ recipient: user?.email, title: (await getTaskById(taskId))!.title, taskId, kind: "completed", summary: action.summary });
    return { completed: true, summary: action.summary };
  }
  const sandbox = await resolveSandbox(taskId);
  const provider = sandboxProviderFor(sandbox.descriptor.provider);
  await hydrateTaskAttachments(taskId, sandbox.descriptor);
  if (action.kind === "run_command") {
    await appendTaskEvent(taskId, { type: "tool_call", payload: { tool: "run_command", command: action.command } });
    const result = await provider.execute(sandbox.descriptor, action.command);
    await appendTaskEvent(taskId, { type: "tool_result", payload: { tool: "run_command", ...result } });
    await checkpointSandbox(sandbox.dbSandboxId, sandbox.descriptor);
    return { completed: false, summary: result.exitCode === 0 ? "Executed a sandbox command." : "A sandbox command returned an error; the agent will assess it." };
  }
  if (action.kind === "write_file") {
    await provider.writeFile(sandbox.descriptor, { path: action.path, content: action.content });
    await appendTaskEvent(taskId, { type: "tool_result", payload: { tool: "write_file", path: action.path, bytes: Buffer.byteLength(action.content) } });
    await checkpointSandbox(sandbox.dbSandboxId, sandbox.descriptor);
    return { completed: false, summary: `Updated ${action.path}.` };
  }
  if (action.kind === "open_url") {
    await provider.openUrl(sandbox.descriptor, action.url);
    await appendTaskEvent(taskId, { type: "tool_result", payload: { tool: "open_url", url: action.url } });
    await checkpointSandbox(sandbox.dbSandboxId, sandbox.descriptor);
    return { completed: false, summary: `Opened ${action.url} in the task browser.` };
  }
  if (action.kind === "capture_screen") {
    const frame = await provider.screenshot(sandbox.descriptor);
    const artifact = await putTaskArtifact({ taskId, filename: "agent-screen.png", body: frame.bytes, contentType: frame.contentType });
    const event = await appendTaskEvent(taskId, { type: "screenshot", payload: { storageKey: artifact.key, storageUrl: artifact.url } });
    await createDeliverable({ taskId, eventId: event.id, filename: "agent-screen.png", fileType: frame.contentType, storageKey: artifact.key, storageUrl: artifact.url, isFinal: false });
    return { completed: false, summary: "Captured the current Agent's Computer frame." };
  }
  if (action.kind === "publish_file") {
    const content = await provider.readFile(sandbox.descriptor, action.path);
    const artifact = await putTaskArtifact({ taskId, filename: action.filename, body: Buffer.from(content, "utf8"), contentType: action.contentType });
    const event = await appendTaskEvent(taskId, { type: "tool_result", payload: { tool: "publish_file", path: action.path, filename: action.filename, storageKey: artifact.key, storageUrl: artifact.url } });
    await createDeliverable({ taskId, eventId: event.id, filename: action.filename, fileType: action.contentType, storageKey: artifact.key, storageUrl: artifact.url, isFinal: true });
    await checkpointSandbox(sandbox.dbSandboxId, sandbox.descriptor);
    return { completed: false, summary: `Published ${action.filename} to task deliverables.` };
  }
  throw new Error(`Unsupported action kind ${(action as { kind: string }).kind}.`);
}

export async function runTaskCycle(taskId: string) {
  const task = await getTaskById(taskId);
  if (!task || ["paused", "needs_input", "completed", "failed", "cancelled"].includes(task.status)) return;
  if (task.startedAt && Date.now() - task.startedAt.getTime() > ENV.taskTimeoutSeconds * 1_000) {
    const summary = "Task execution time cap reached.";
    await updateTaskForWorker(task.id, { status: "failed", currentStepSummary: summary, failedReason: summary, completedAt: new Date() });
    await appendTaskEvent(task.id, { type: "error", payload: { code: "task_timeout", message: summary } });
    await appendTaskEvent(task.id, { type: "status_change", payload: { status: "failed", summary } });
    return;
  }
  try {
    const [events, attachments] = await Promise.all([listTaskEvents(task.id), listTaskAttachments(task.id)]);
    const iterations = events.filter(event => event.type === "tool_call").length;
    if (iterations >= ENV.maxAgentIterations) {
      await updateTaskForWorker(task.id, { status: "needs_input", currentStepSummary: "Iteration safety cap reached." });
      await appendTaskEvent(task.id, { type: "status_change", payload: { status: "needs_input", summary: "Iteration safety cap reached." } });
      return;
    }
    await updateTaskForWorker(task.id, { status: "planning", currentStepSummary: "Analyzing task state and selecting one action.", startedAt: task.startedAt ?? new Date() });
    await appendTaskEvent(task.id, { type: "status_change", payload: { status: "planning", summary: "Analyzing task state and selecting one action." } });
    const autonomySettings = task.autonomySettings as AutonomySettings;
    const automaticRoute = autonomySettings.automaticRoute;
    if (automaticRoute?.reason === "public_media" && automaticRoute.kind === "public_video" && automaticRoute.provider === "supadata" && automaticRoute.sourceUrl) {
      if (await requireAutomaticMediaApproval({ taskId: task.id, kind: "public_video", provider: automaticRoute.provider, sourceUrl: automaticRoute.sourceUrl })) return;
      await updateTaskForWorker(task.id, { status: "running", currentStepSummary: "Understanding the requested public video." });
      const analysis = await executeSupadataPublicVideoUnderstanding({ taskId: task.id, userId: task.userId, sourceUrl: automaticRoute.sourceUrl, prompt: task.goal });
      const summary = `Created ${analysis.filename}.`;
      await recordAgentMessage(task.id, summary);
      await updateTaskForWorker(task.id, { status: "completed", currentStepSummary: summary, completedAt: new Date() });
      await appendTaskEvent(task.id, { type: "status_change", payload: { status: "completed", summary } });
      const user = await getUserById(task.userId);
      await notifyTask({ recipient: user?.email, title: task.title, taskId: task.id, kind: "completed", summary });
      return;
    }
    if (automaticRoute?.reason === "natural_language_media" && (automaticRoute.kind === "image" || automaticRoute.kind === "video" || automaticRoute.kind === "audio") && automaticRoute.provider !== "supadata" && automaticRoute.provider && automaticRoute.model) {
      if (await requireAutomaticMediaApproval({ taskId: task.id, kind: automaticRoute.kind, provider: automaticRoute.provider, model: automaticRoute.model })) return;
      const label = automaticRoute.kind === "image" ? "image" : automaticRoute.kind === "video" ? "video" : "audio";
      await updateTaskForWorker(task.id, { status: "running", currentStepSummary: `Creating the requested ${label} artifact.` });
      const generated = await executeTaskMedia({
        taskId: task.id,
        userId: task.userId,
        kind: automaticRoute.kind,
        prompt: task.goal,
        provider: automaticRoute.provider,
        model: automaticRoute.model,
      });
      const summary = `Created ${generated.filename}.`;
      await recordAgentMessage(task.id, summary);
      await updateTaskForWorker(task.id, { status: "completed", currentStepSummary: summary, completedAt: new Date() });
      await appendTaskEvent(task.id, { type: "status_change", payload: { status: "completed", summary } });
      const user = await getUserById(task.userId);
      await notifyTask({ recipient: user?.email, title: task.title, taskId: task.id, kind: "completed", summary });
      return;
    }
    const routing = resolveAutomaticTaskModel({
      selectedModel: autonomySettings.selectedModel,
      involvesCode: task.involvesCode,
      attachments,
      models: runtimeConfiguredComposerModels(),
    });
    if (!routing.candidates.length) throw new LlmRouteUnavailableError();
    const personalization = await getApprovedPersonalizationContext(task.userId);
    const personalizationPrompt = personalizationInstruction(personalization);
    const policyPacksPrompt = policyPackPlanningContext(await listEnabledPolicyPacksForPlanning(task.userId, task.goal));
    const cachedSkillSelections = await getTaskSkillSelectionsForUser(task.id, task.userId);
    const taskSkills = cachedSkillSelections.length
      ? cachedSkillSelections
      : await cacheTaskSkillSelections({
        taskId: task.id,
        userId: task.userId,
        selections: rankSkillsForGoal(task.goal, await listEnabledSkillCandidatesForUser(task.userId)).map(skill => ({
          skillId: skill.id,
          skillName: skill.name,
          skillMdContent: skill.skillMdContent,
          relevanceScore: skill.relevanceScore,
        })),
      });
    const skillsPrompt = skillPlanningContext(taskSkills);
    let model: Awaited<ReturnType<typeof generateWithFallback>> | undefined;
    let decision: ModelDecision | undefined;
    let lastAutomaticRouteError: LlmRouteUnavailableError | LlmStructuredOutputError | undefined;
    for (const selectedModel of routing.candidates) {
      try {
        const candidateModel = await generateWithFallback({
          purpose: "orchestrator",
          selectedModel,
          candidateModels: [selectedModel],
          messages: [
            {
              role: "system",
              content: [
                "You are Synthia AI's task orchestrator. Choose exactly one next action. Never execute external side effects; use external_effect to request approval. Keep all sandbox files under /workspace. Task input attachments are hydrated as read-only files in /workspace/inputs before a sandbox action; inspect them only through sandbox commands. Use publish_file with a workspace path, a plain filename, and a MIME type to deliver a file. Return only JSON: { narration: string, action: { kind: respond|web_search|run_command|write_file|open_url|capture_screen|publish_file|complete|external_effect, ... }, plan?: [{id,title,state}] }.",
                personalizationPrompt,
                policyPacksPrompt,
                skillsPrompt,
              ].filter(Boolean).join("\n\n"),
            },
            { role: "user", content: await taskModelInput({ title: task.title, goal: task.goal, plan: task.plan, attachments, selectedModel, events: taskContext(events) }) },
          ],
        });
        model = candidateModel;
        decision = validatedDecision(parseStructuredModelOutput<ModelDecision>(candidateModel.content));
        break;
      } catch (error) {
        if (routing.reason !== "manual" && (error instanceof LlmRouteUnavailableError || error instanceof LlmStructuredOutputError)) {
          lastAutomaticRouteError = error;
          continue;
        }
        throw error;
      }
    }
    if (!model || !decision) throw lastAutomaticRouteError ?? new LlmRouteUnavailableError();
    await recordUsageForTask({
    userId: task.userId,
    taskId: task.id,
    creditsDelta: Number((Math.max(1, model.usage.totalTokens) / 1_000).toFixed(4)),
    reason: "orchestrator_model_tokens",
    metadata: { provider: model.provider, model: model.model, usage: model.usage, responseId: model.rawResponseId },
  });
    await recordAgentMessage(task.id, decision.narration);
    if (decision.plan) {
    await updateTaskForWorker(task.id, { plan: decision.plan });
    await appendTaskEvent(task.id, { type: "plan_update", payload: { plan: decision.plan, source: "agent" } });
  }
    const policy = evaluateActionPolicy(decision.action, autonomySettings);
    if (!policy.allowed) {
    if (!policy.requiresApproval) throw new Error(policy.reason);
    const event = await appendTaskEvent(task.id, { type: "approval_request", payload: { action: decision.action, reason: policy.reason, riskLevel: policy.riskLevel } });
    await createApprovalForTask({
      taskId: task.id,
      eventId: event.id,
      description: (decision.action as Extract<AgentAction, { kind: "external_effect" }>).description,
      riskLevel: policy.riskLevel,
      toolName: (decision.action as Extract<AgentAction, { kind: "external_effect" }>).toolName,
      toolInput: (decision.action as Extract<AgentAction, { kind: "external_effect" }>).input,
    });
    await updateTaskForWorker(task.id, { status: "needs_input", currentStepSummary: "Waiting for approval before an external effect." });
    const user = await getUserById(task.userId);
    await notifyTask({ recipient: user?.email, title: task.title, taskId: task.id, kind: "approval", summary: "Synthia AI needs your explicit approval before performing an external effect." });
    return;
  }
    await updateTaskForWorker(task.id, { status: "running", currentStepSummary: decision.narration });
    const result = await executeAction(task.id, decision.action);
    if (!result.completed) {
      await updateTaskForWorker(task.id, { status: "queued", currentStepSummary: result.summary });
      await enqueueTaskCycle(task.id, 150);
    }
  } catch (error) {
    if (error instanceof LlmRouteUnavailableError) {
      const message = "No configured model route is currently available. Choose an available model or try again later.";
      logger.warn({ event: "agent_model_route_unavailable", taskId: task.id }, "Task paused because no configured model route is available");
      await updateTaskForWorker(task.id, { status: "needs_input", currentStepSummary: "Waiting for an available model route.", failedReason: message });
      await appendTaskEvent(task.id, { type: "error", payload: { code: "model_route_unavailable", message } });
      const user = await getUserById(task.userId);
      await notifyTask({ recipient: user?.email, title: task.title, taskId: task.id, kind: "failed", summary: "No configured model route is currently available. Choose an available model or try again later." });
      return;
    }
    if (error instanceof LlmStructuredOutputError) {
      const message = "The selected model returned an unusable planning response. Choose another model or try again later.";
      logger.warn({ event: "agent_model_response_unusable", taskId: task.id }, "Task paused because the selected model response could not be used safely");
      await updateTaskForWorker(task.id, { status: "needs_input", currentStepSummary: "Waiting for a usable planning response.", failedReason: message });
      await appendTaskEvent(task.id, { type: "error", payload: { code: "model_response_unusable", message } });
      const user = await getUserById(task.userId);
      await notifyTask({ recipient: user?.email, title: task.title, taskId: task.id, kind: "failed", summary: message });
      return;
    }
    const errorKind = error instanceof Error && error.name ? error.name : "unknown_error";
    const message = "The task worker encountered a temporary issue and will retry according to task policy.";
    logger.error({ event: "agent_cycle_error", taskId: task.id, errorKind }, "Agent task cycle failed");
    await updateTaskForWorker(task.id, { status: "queued", currentStepSummary: "Recovering from a worker error.", failedReason: message });
    await appendTaskEvent(task.id, { type: "error", payload: { code: "agent_cycle_error", message } });
    const user = await getUserById(task.userId);
    await notifyTask({ recipient: user?.email, title: task.title, taskId: task.id, kind: "failed", summary: "The worker encountered an error and will retry according to task policy." });
    throw error;
  }
}
