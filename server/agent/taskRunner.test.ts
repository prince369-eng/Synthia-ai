import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  appendTaskEvent: vi.fn(),
  createApprovalForTask: vi.fn(),
  createDeliverable: vi.fn(),
  createSandboxForTask: vi.fn(),
  getRecoverableSandboxForTask: vi.fn(),
  getTaskById: vi.fn(),
  getUserById: vi.fn(),
  listTaskEvents: vi.fn(),
  recordAgentMessage: vi.fn(),
  recordUsageForTask: vi.fn(),
  restoreSandboxForTask: vi.fn(),
  updateSandboxCheckpoint: vi.fn(),
  updateTaskForWorker: vi.fn(),
};
const queue = { enqueueTaskCycle: vi.fn() };
const provider = { restore: vi.fn(), execute: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openUrl: vi.fn(), screenshot: vi.fn(), checkpoint: vi.fn() };
const llm = { generateWithFallback: vi.fn() };

vi.mock("../db", () => db);
vi.mock("./queue", () => queue);
vi.mock("./sandbox", () => ({ sandboxProviderFor: vi.fn(() => provider), createSandboxProvider: vi.fn(() => provider) }));
vi.mock("./llm", async importOriginal => {
  const actual = await importOriginal<typeof import("./llm")>();
  return { ...actual, generateWithFallback: llm.generateWithFallback };
});
const artifacts = { putTaskArtifact: vi.fn() };
vi.mock("./artifactStorage", () => artifacts);
vi.mock("./notifications", () => ({ notifyTask: vi.fn() }));

const baseTask = {
  id: "task-1",
  userId: 7,
  title: "Recover a task",
  goal: "Run a bounded command after restoring its checkpoint.",
  status: "queued",
  startedAt: null,
  plan: [],
  autonomySettings: { allowWebSearch: true, allowCodeExecution: true, allowFileWrites: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.getTaskById.mockResolvedValue(baseTask);
  db.listTaskEvents.mockResolvedValue([]);
  db.appendTaskEvent.mockResolvedValue({ id: "event-1", sequenceNumber: 1 });
  db.recordAgentMessage.mockResolvedValue(undefined);
  db.recordUsageForTask.mockResolvedValue(undefined);
  db.updateTaskForWorker.mockResolvedValue(undefined);
  db.restoreSandboxForTask.mockResolvedValue(undefined);
  db.updateSandboxCheckpoint.mockResolvedValue(undefined);
  queue.enqueueTaskCycle.mockResolvedValue(true);
});

describe("Synthia task worker recovery", () => {
  it("restores a checkpointed sandbox, records usage, checkpoints the new state, and queues the next cycle", async () => {
    db.getRecoverableSandboxForTask.mockResolvedValue({
      id: "sandbox-row-1",
      provider: "docker",
      status: "checkpointed",
      checkpointRef: "checkpoint-v1",
      providerSandboxId: "stale-container",
      region: "local",
      maxSessionSeconds: 3_600,
    });
    provider.restore.mockResolvedValue({ provider: "docker", providerSandboxId: "restored-container", region: "local", maxSessionSeconds: 3_600 });
    provider.execute.mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
    provider.checkpoint.mockResolvedValue("checkpoint-v2");
    llm.generateWithFallback.mockResolvedValue({
      provider: "groq",
      model: "model",
      content: JSON.stringify({ narration: "Resuming from checkpoint.", action: { kind: "run_command", command: "pwd" } }),
      usage: { inputTokens: 250, outputTokens: 50, totalTokens: 300 },
      rawResponseId: "response-1",
    });
    const { runTaskCycle } = await import("./taskRunner");

    await runTaskCycle(baseTask.id);

    expect(provider.restore).toHaveBeenCalledWith("checkpoint-v1");
    expect(db.restoreSandboxForTask).toHaveBeenCalledWith("sandbox-row-1", "restored-container");
    expect(provider.execute).toHaveBeenCalledWith(expect.objectContaining({ providerSandboxId: "restored-container" }), "pwd");
    expect(db.updateSandboxCheckpoint).toHaveBeenCalledWith("sandbox-row-1", "checkpoint-v2");
    expect(db.recordUsageForTask).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, taskId: "task-1", creditsDelta: 0.3, reason: "orchestrator_model_tokens" }));
    expect(db.updateTaskForWorker).toHaveBeenLastCalledWith("task-1", expect.objectContaining({ status: "queued" }));
    expect(queue.enqueueTaskCycle).toHaveBeenCalledWith("task-1", 150);
  });

  it("records usage but halts before an external effect and creates a durable approval request", async () => {
    llm.generateWithFallback.mockResolvedValue({
      provider: "gemini",
      model: "model",
      content: JSON.stringify({ narration: "This needs approval.", action: { kind: "external_effect", toolName: "email.send", description: "Send a project update", input: { recipient: "person@example.com" } } }),
      usage: { inputTokens: 500, outputTokens: 125, totalTokens: 625 },
    });
    db.getUserById.mockResolvedValue({ email: null });
    const { runTaskCycle } = await import("./taskRunner");

    await runTaskCycle(baseTask.id);

    expect(db.recordUsageForTask).toHaveBeenCalledWith(expect.objectContaining({ creditsDelta: 0.625 }));
    expect(db.createApprovalForTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: "task-1", toolName: "email.send", riskLevel: "high" }));
    expect(db.updateTaskForWorker).toHaveBeenLastCalledWith("task-1", expect.objectContaining({ status: "needs_input" }));
    expect(queue.enqueueTaskCycle).not.toHaveBeenCalled();
  });

  it("publishes a sandbox file as a durable final deliverable", async () => {
    db.getRecoverableSandboxForTask.mockResolvedValue({ id: "sandbox-row-1", provider: "docker", status: "active", providerSandboxId: "sandbox-1", region: "local", maxSessionSeconds: 3_600 });
    provider.readFile.mockResolvedValue("# Task report\n");
    provider.checkpoint.mockResolvedValue("checkpoint-file");
    artifacts.putTaskArtifact.mockResolvedValue({ key: "tasks/task-1/report.md", url: "https://storage.example/tasks/task-1/report.md" });
    llm.generateWithFallback.mockResolvedValue({ provider: "groq", model: "model", content: JSON.stringify({ narration: "Publishing the report.", action: { kind: "publish_file", path: "/workspace/report.md", filename: "report.md", contentType: "text/markdown" } }), usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } });
    const { runTaskCycle } = await import("./taskRunner");

    await runTaskCycle(baseTask.id);

    expect(provider.readFile).toHaveBeenCalledWith(expect.any(Object), "/workspace/report.md");
    expect(artifacts.putTaskArtifact).toHaveBeenCalledWith(expect.objectContaining({ filename: "report.md", contentType: "text/markdown" }));
    expect(db.createDeliverable).toHaveBeenCalledWith(expect.objectContaining({ filename: "report.md", isFinal: true }));
    expect(queue.enqueueTaskCycle).toHaveBeenCalledWith("task-1", 150);
  });
});
