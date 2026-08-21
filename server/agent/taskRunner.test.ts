import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  appendTaskEvent: vi.fn(),
  createApprovalForTask: vi.fn(),
  createDeliverable: vi.fn(),
  createSandboxForTask: vi.fn(),
  getRecoverableSandboxForTask: vi.fn(),
  getApprovedPersonalizationContext: vi.fn(),
  getTaskSkillSelectionsForUser: vi.fn(),
  getTaskById: vi.fn(),
  getUserById: vi.fn(),
  listTaskAttachments: vi.fn(),
  listEnabledSkillCandidatesForUser: vi.fn(),
  cacheTaskSkillSelections: vi.fn(),
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
const modelCatalog = { runtimeConfiguredComposerModels: vi.fn() };
const taskMedia = { executeTaskMedia: vi.fn() };
const supadata = { executeSupadataPublicVideoUnderstanding: vi.fn() };

vi.mock("../db", () => db);
vi.mock("./queue", () => queue);
vi.mock("./sandbox", () => ({ sandboxProviderFor: vi.fn(() => provider), createSandboxProvider: vi.fn(() => provider) }));
vi.mock("./llm", async importOriginal => {
  const actual = await importOriginal<typeof import("./llm")>();
  return { ...actual, generateWithFallback: llm.generateWithFallback };
});
vi.mock("./modelCatalog", () => modelCatalog);
vi.mock("../media/taskMedia", () => taskMedia);
vi.mock("../integrations/supadata", () => supadata);
const artifacts = { getTaskArtifactUrl: vi.fn(), putTaskArtifact: vi.fn() };
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
  db.getApprovedPersonalizationContext.mockResolvedValue({ dimensions: null, sessionMemories: [], longTermMemories: [] });
  db.getTaskSkillSelectionsForUser.mockResolvedValue([]);
  db.listEnabledSkillCandidatesForUser.mockResolvedValue([]);
  db.cacheTaskSkillSelections.mockResolvedValue([]);
  db.listTaskAttachments.mockResolvedValue([]);
  db.listTaskEvents.mockResolvedValue([]);
  db.appendTaskEvent.mockResolvedValue({ id: "event-1", sequenceNumber: 1 });
  db.recordAgentMessage.mockResolvedValue(undefined);
  db.recordUsageForTask.mockResolvedValue(undefined);
  db.updateTaskForWorker.mockResolvedValue(undefined);
  db.restoreSandboxForTask.mockResolvedValue(undefined);
  db.updateSandboxCheckpoint.mockResolvedValue(undefined);
  modelCatalog.runtimeConfiguredComposerModels.mockReturnValue([
    { id: "aihubmix:glm-5.2-free", provider: "aihubmix", model: "glm-5.2-free", label: "Primary", capabilities: ["text"] },
    { id: "agnes:agnes-2.0-flash", provider: "agnes", model: "agnes-2.0-flash", label: "Configured", capabilities: ["text", "vision"] },
    { id: "aihubmix:coding-glm-5.2-free", provider: "aihubmix", model: "coding-glm-5.2-free", label: "Configured", capabilities: ["text"] },
  ]);
  taskMedia.executeTaskMedia.mockResolvedValue({ filename: "synthia-video-1.mp4", fileType: "video/mp4", provider: "pixazo", model: "ltx", deliverableId: "deliverable-1" });
  supadata.executeSupadataPublicVideoUnderstanding.mockResolvedValue({ filename: "synthia-public-video-analysis-1.json", deliverableId: "deliverable-2" });
  artifacts.getTaskArtifactUrl.mockResolvedValue("https://storage.example/task-input.png");
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

  it("uses the resolved vision route for an image task rather than passing an empty Automatic selection to the model adapter", async () => {
    db.getTaskById.mockResolvedValue({ ...baseTask, involvesCode: false });
    db.listTaskAttachments.mockResolvedValue([{ sourceType: "library", filename: "reference.png", fileType: "image/png", storageKey: "task-input.png" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 })));
    llm.generateWithFallback.mockResolvedValue({ provider: "agnes", model: "agnes-2.0-flash", content: JSON.stringify({ narration: "I reviewed the visual input.", action: { kind: "respond", content: "I reviewed the visual input." } }), usage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 } });
    const { runTaskCycle } = await import("./taskRunner");

    await runTaskCycle(baseTask.id);

    expect(llm.generateWithFallback).toHaveBeenCalledWith(expect.objectContaining({ selectedModel: { provider: "agnes", model: "agnes-2.0-flash" } }));
  });

  it("uses the resolved code route for a development task while preserving the default automatic model catalog", async () => {
    db.getTaskById.mockResolvedValue({ ...baseTask, involvesCode: true });
    llm.generateWithFallback.mockResolvedValue({ provider: "aihubmix", model: "coding-glm-5.2-free", content: JSON.stringify({ narration: "I will prepare the implementation.", action: { kind: "respond", content: "I will prepare the implementation." } }), usage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 } });
    const { runTaskCycle } = await import("./taskRunner");

    await runTaskCycle(baseTask.id);

    expect(llm.generateWithFallback).toHaveBeenCalledWith(expect.objectContaining({ selectedModel: { provider: "aihubmix", model: "coding-glm-5.2-free" } }));
  });

  it("uses the configured Automatic video route after the user starts a natural-language media task without invoking the text-model adapter", async () => {
    db.getTaskById.mockResolvedValue({
      ...baseTask,
      autonomySettings: {
        ...baseTask.autonomySettings,
        automaticRoute: { kind: "video", reason: "natural_language_media", requestedKind: "video", provider: "pixazo", model: "ltx" },
      },
    });
    const { runTaskCycle } = await import("./taskRunner");

    await runTaskCycle(baseTask.id);

    expect(taskMedia.executeTaskMedia).toHaveBeenCalledWith(expect.objectContaining({ taskId: "task-1", userId: 7, kind: "video", provider: "pixazo", model: "ltx", prompt: baseTask.goal }));
    expect(llm.generateWithFallback).not.toHaveBeenCalled();
    expect(db.updateTaskForWorker).toHaveBeenLastCalledWith("task-1", expect.objectContaining({ status: "completed", currentStepSummary: "Created synthia-video-1.mp4." }));
  });

  it("uses the configured Automatic public-video route after the user starts a supported social-video task without invoking the text-model adapter", async () => {
    db.getTaskById.mockResolvedValue({
      ...baseTask,
      goal: "Analyze https://www.youtube.com/watch?v=abc123 and return product lessons.",
      autonomySettings: {
        ...baseTask.autonomySettings,
        automaticRoute: { kind: "public_video", reason: "public_media", requestedKind: "public_video", provider: "supadata", sourceUrl: "https://www.youtube.com/watch?v=abc123" },
      },
    });
    const { runTaskCycle } = await import("./taskRunner");

    await runTaskCycle(baseTask.id);

    expect(supadata.executeSupadataPublicVideoUnderstanding).toHaveBeenCalledWith(expect.objectContaining({ taskId: "task-1", userId: 7, sourceUrl: "https://www.youtube.com/watch?v=abc123" }));
    expect(llm.generateWithFallback).not.toHaveBeenCalled();
    expect(db.updateTaskForWorker).toHaveBeenLastCalledWith("task-1", expect.objectContaining({ status: "completed", currentStepSummary: "Created synthia-public-video-analysis-1.json." }));
  });
});
