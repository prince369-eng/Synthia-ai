import {
  type AutonomySettings,
  appendTaskEvent,
  createApprovalForTask,
  createDeliverable,
  createSandboxForTask,
  getRecoverableSandboxForTask,
  getTaskById,
  getUserById,
  listTaskEvents,
  recordAgentMessage,
  recordUsageForTask,
  restoreSandboxForTask,
  updateSandboxCheckpoint,
  updateTaskForWorker,
} from "../db";
import { ENV } from "../_core/env";
import { putTaskArtifact } from "./artifactStorage";
import { generateWithFallback, parseStructuredModelOutput } from "./llm";
import { evaluateActionPolicy, isAgentAction, type AgentAction } from "./policy";
import { enqueueTaskCycle } from "./queue";
import { sandboxProviderFor, createSandboxProvider, type SandboxDescriptor } from "./sandbox";
import { searchWeb } from "./search";
import { logger } from "../security/logger";
import { notifyTask } from "./notifications";

type ModelDecision = {
  narration: string;
  action: AgentAction;
  plan?: Array<{ id: string; title: string; state: "pending" | "active" | "done" | "blocked" }>;
};

function taskContext(events: Awaited<ReturnType<typeof listTaskEvents>>) {
  return events.slice(-40).map(event => ({ sequence: event.sequenceNumber, type: event.type, payload: event.payload }));
}

function validatedDecision(value: unknown): ModelDecision {
  if (!value || typeof value !== "object") throw new Error("The model returned an invalid action decision.");
  const decision = value as Record<string, unknown>;
  if (typeof decision.narration !== "string" || decision.narration.trim().length === 0 || !isAgentAction(decision.action)) {
    throw new Error("The model decision must include narration and one valid action.");
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
    const events = await listTaskEvents(task.id);
    const iterations = events.filter(event => event.type === "tool_call").length;
    if (iterations >= ENV.maxAgentIterations) {
      await updateTaskForWorker(task.id, { status: "needs_input", currentStepSummary: "Iteration safety cap reached." });
      await appendTaskEvent(task.id, { type: "status_change", payload: { status: "needs_input", summary: "Iteration safety cap reached." } });
      return;
    }
    await updateTaskForWorker(task.id, { status: "planning", currentStepSummary: "Analyzing task state and selecting one action.", startedAt: task.startedAt ?? new Date() });
    await appendTaskEvent(task.id, { type: "status_change", payload: { status: "planning", summary: "Analyzing task state and selecting one action." } });
    const model = await generateWithFallback({
    purpose: "orchestrator",
    messages: [
      {
        role: "system",
        content: "You are Synthia AI's task orchestrator. Choose exactly one next action. Never execute external side effects; use external_effect to request approval. Keep all sandbox files under /workspace. Use publish_file with a workspace path, a plain filename, and a MIME type to deliver a file. Return only JSON: { narration: string, action: { kind: respond|web_search|run_command|write_file|open_url|capture_screen|publish_file|complete|external_effect, ... }, plan?: [{id,title,state}] }.",
      },
      { role: "user", content: JSON.stringify({ title: task.title, goal: task.goal, plan: task.plan, events: taskContext(events) }) },
    ],
  });
    const decision = validatedDecision(parseStructuredModelOutput<ModelDecision>(model.content));
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
    const policy = evaluateActionPolicy(decision.action, task.autonomySettings as AutonomySettings);
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
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown agent-cycle failure.";
    logger.error({ event: "agent_cycle_error", taskId: task.id, error: message }, "Agent task cycle failed");
    await updateTaskForWorker(task.id, { status: "queued", currentStepSummary: "Recovering from a worker error.", failedReason: message });
    await appendTaskEvent(task.id, { type: "error", payload: { code: "agent_cycle_error", message } });
    const user = await getUserById(task.userId);
    await notifyTask({ recipient: user?.email, title: task.title, taskId: task.id, kind: "failed", summary: "The worker encountered an error and will retry according to task policy." });
    throw error;
  }
}
