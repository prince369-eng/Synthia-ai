import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import * as rateLimit from "./security/rateLimit";
import * as queue from "./agent/queue";
import { logger } from "./security/logger";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const projectId = "11111111-1111-4111-8111-111111111111";
const applicationUserId = 3;

function createContext(cookie = "app_session_id=user-session-token"): TrpcContext {
  return {
    user: {
      id: applicationUserId,
      openId: "project-owner",
      name: "Project Owner",
      email: "owner@example.test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: { cookie } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("projects and scheduled router procedures", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(rateLimit, "enforceRateLimit").mockResolvedValue(undefined);
  });

  it("creates projects only for the authenticated owner", async () => {
    const created = { id: projectId, userId: applicationUserId, name: "Website launch", description: "Prepare launch work." };
    vi.spyOn(db, "createProjectForUser").mockResolvedValue(created as never);

    const result = await appRouter.createCaller(createContext()).projects.create({
      name: "Website launch",
      description: "Prepare launch work.",
    });

    expect(db.createProjectForUser).toHaveBeenCalledWith({
      userId: applicationUserId,
      name: "Website launch",
      description: "Prepare launch work.",
    });
    expect(result).toEqual(created);
  });

  it("prevents task creation inside a project the caller does not own", async () => {
    vi.spyOn(db, "getProjectForUser").mockResolvedValue(undefined);
    const createTask = vi.spyOn(db, "createTaskForUser");

    await expect(appRouter.createCaller(createContext()).tasks.create({
      goal: "Build a securely scoped project task.",
      projectId,
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: true,
        allowCodeExecution: false,
        allowFileWrites: false,
      },
      involvesCode: false,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(createTask).not.toHaveBeenCalled();
  });

  it("fails closed with bounded guidance when mutation rate-limit infrastructure is unavailable", async () => {
    vi.spyOn(rateLimit, "enforceRateLimit").mockRejectedValue(new Error("redis://operator:credential@cache.internal:6379"));
    const createTask = vi.spyOn(db, "createTaskForUser");
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);

    await expect(appRouter.createCaller(createContext()).tasks.create({
      goal: "Prepare a secure recovery note for unavailable task protection.",
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: false,
        allowCodeExecution: false,
        allowFileWrites: false,
      },
      involvesCode: false,
    })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Request protection is temporarily unavailable. Please try again shortly.",
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({
      event: "mutation_rate_limit_unavailable",
      userId: applicationUserId,
      scope: "task-create",
      errorKind: "Error",
    }), "Mutation rate-limit infrastructure is unavailable");
    expect(JSON.stringify(logError.mock.calls)).not.toContain("redis://operator:credential@cache.internal:6379");
  });

  it("creates an authenticated task with owned uploaded inputs and queues its first execution cycle", async () => {
    const taskId = "33333333-3333-4333-8333-333333333333";
    const createdTask = { id: taskId, userId: applicationUserId, status: "queued", title: "Prepare a secured implementation brief" };
    vi.spyOn(db, "createTaskForUser").mockResolvedValue(createdTask as never);
    vi.spyOn(db, "appendTaskEvent").mockResolvedValue({ id: "event-automatic-route", sequenceNumber: 1 } as never);
    vi.spyOn(queue, "enqueueTaskCycle").mockResolvedValue(true);

    const result = await appRouter.createCaller(createContext()).tasks.create({
      goal: "Prepare a secured implementation brief using the attached operating notes.",
      title: "Prepare a secured implementation brief",
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: true,
        allowCodeExecution: false,
        allowFileWrites: false,
      },
      involvesCode: false,
      attachments: [{
        sourceType: "upload",
        filename: "operating-notes.txt",
        fileType: "text/plain",
        storageKey: "task-inputs/3/operating-notes.txt",
        storageUrl: "/manus-storage/task-inputs/3/operating-notes.txt",
      }],
    });

    expect(db.createTaskForUser).toHaveBeenCalledWith(expect.objectContaining({
      userId: applicationUserId,
      title: "Prepare a secured implementation brief",
      attachments: [{
        sourceType: "upload",
        filename: "operating-notes.txt",
        fileType: "text/plain",
        storageKey: "task-inputs/3/operating-notes.txt",
        storageUrl: "/manus-storage/task-inputs/3/operating-notes.txt",
      }],
    }));
    expect(db.appendTaskEvent).toHaveBeenCalledWith(taskId, expect.objectContaining({
      type: "task_metadata",
      payload: expect.objectContaining({ action: "automatic_route_selected", route: "text" }),
    }));
    expect(queue.enqueueTaskCycle).toHaveBeenCalledWith(taskId);
    expect(result).toEqual({ task: createdTask, executionQueued: true });
  });

  it("returns bounded recovery guidance when task persistence fails without queueing work", async () => {
    const persistenceFailure = new Error("postgres://operator:credential@database.internal/task-store");
    vi.spyOn(db, "createTaskForUser").mockRejectedValue(persistenceFailure);
    const enqueueTask = vi.spyOn(queue, "enqueueTaskCycle");
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);

    await expect(appRouter.createCaller(createContext()).tasks.create({
      goal: "Prepare a compact recovery brief for the protected task store.",
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: false,
        allowCodeExecution: false,
        allowFileWrites: false,
      },
      involvesCode: false,
    })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Task creation is temporarily unavailable. Please try again shortly.",
    });

    expect(enqueueTask).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({
      event: "task_create_persistence_failed",
      userId: applicationUserId,
      taskCreationStage: "persistence",
      errorKind: "Error",
    }), "Task persistence failed");
    expect(JSON.stringify(logError.mock.calls)).not.toContain("postgres://operator:credential@database.internal/task-store");
  });

  it("keeps a created task available when automatic-route event persistence fails", async () => {
    const taskId = "44444444-4444-4444-8444-444444444444";
    const createdTask = { id: taskId, userId: applicationUserId, status: "queued", title: "Persisted task" };
    vi.spyOn(db, "createTaskForUser").mockResolvedValue(createdTask as never);
    vi.spyOn(db, "appendTaskEvent").mockRejectedValue(new Error("event sequence unavailable"));
    vi.spyOn(queue, "enqueueTaskCycle").mockResolvedValue(true);
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);

    const result = await appRouter.createCaller(createContext()).tasks.create({
      goal: "Prepare a bounded summary of retained task state after event failure.",
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: false,
        allowCodeExecution: false,
        allowFileWrites: false,
      },
      involvesCode: false,
    });

    expect(result).toEqual({ task: createdTask, executionQueued: true });
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({
      event: "task_create_metadata_event_failed",
      taskId,
      taskCreationStage: "metadata_event",
      errorKind: "Error",
    }), "Task metadata event could not be persisted after creation");
  });

  it("keeps a created task available when the initial queue operation fails", async () => {
    const taskId = "55555555-5555-4555-8555-555555555555";
    const createdTask = { id: taskId, userId: applicationUserId, status: "queued", title: "Persisted task" };
    const pausedForRecovery = { ...createdTask, status: "needs_input", currentStepSummary: "Task created, but execution could not be queued. Restore the queue service, then resume this task." };
    vi.spyOn(db, "createTaskForUser").mockResolvedValue(createdTask as never);
    vi.spyOn(db, "appendTaskEvent").mockResolvedValue({ id: "event-automatic-route", sequenceNumber: 3 } as never);
    vi.spyOn(db, "updateTaskForUser").mockResolvedValue(pausedForRecovery as never);
    vi.spyOn(queue, "enqueueTaskCycle").mockRejectedValue(new Error("redis task queue unavailable"));
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);

    const result = await appRouter.createCaller(createContext()).tasks.create({
      goal: "Prepare a compact report while the deferred execution queue is unavailable.",
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: false,
        allowCodeExecution: false,
        allowFileWrites: false,
      },
      involvesCode: false,
    });

    expect(result).toEqual({ task: pausedForRecovery, executionQueued: false });
    expect(db.updateTaskForUser).toHaveBeenCalledWith(taskId, applicationUserId, expect.objectContaining({ status: "needs_input" }));
    expect(db.appendTaskEvent).toHaveBeenLastCalledWith(taskId, expect.objectContaining({
      type: "error",
      payload: expect.objectContaining({ category: "queue_unavailable" }),
    }));
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({
      event: "task_create_queue_failed",
      taskId,
      taskCreationStage: "queue",
      errorKind: "Error",
    }), "Task was created but its initial execution cycle was not queued");
  });

  it("marks a created task for recovery when queueing is not configured", async () => {
    const taskId = "66666666-6666-4666-8666-666666666666";
    const createdTask = { id: taskId, userId: applicationUserId, status: "queued", title: "Deferred task" };
    const pausedForRecovery = { ...createdTask, status: "needs_input", currentStepSummary: "Task created, but execution could not be queued. Restore the queue service, then resume this task." };
    vi.spyOn(db, "createTaskForUser").mockResolvedValue(createdTask as never);
    vi.spyOn(db, "appendTaskEvent").mockResolvedValue({ id: "event-automatic-route", sequenceNumber: 4 } as never);
    vi.spyOn(db, "updateTaskForUser").mockResolvedValue(pausedForRecovery as never);
    vi.spyOn(queue, "enqueueTaskCycle").mockResolvedValue(false);

    const result = await appRouter.createCaller(createContext()).tasks.create({
      goal: "Prepare a recovery-ready task while the execution queue is not configured.",
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: false,
        allowCodeExecution: false,
        allowFileWrites: false,
      },
      involvesCode: false,
    });

    expect(result).toEqual({ task: pausedForRecovery, executionQueued: false });
    expect(db.updateTaskForUser).toHaveBeenCalledWith(taskId, applicationUserId, expect.objectContaining({ status: "needs_input" }));
    expect(db.appendTaskEvent).toHaveBeenLastCalledWith(taskId, expect.objectContaining({
      type: "error",
      payload: expect.objectContaining({ category: "queue_unavailable" }),
    }));
  });

  it("refuses unconnected app selections before creating a task or queueing work", async () => {
    vi.spyOn(db, "listIntegrationsForUser").mockResolvedValue([] as never);
    const createTask = vi.spyOn(db, "createTaskForUser");
    const enqueueTask = vi.spyOn(queue, "enqueueTaskCycle");

    await expect(appRouter.createCaller(createContext()).tasks.create({
      goal: "Prepare a consent-first customer follow-up brief.",
      autonomySettings: {
        mode: "ask_before_risky",
        allowWebSearch: false,
        allowCodeExecution: false,
        allowFileWrites: false,
        selectedConnectedApps: ["gmail"],
      },
      involvesCode: false,
    })).rejects.toMatchObject({ code: "FORBIDDEN", message: "Connect each selected app before adding it to this task." });

    expect(createTask).not.toHaveBeenCalled();
    expect(enqueueTask).not.toHaveBeenCalled();
  });

  it("lists only the caller's user-owned scheduled workflows without querying raw Heartbeat jobs", async () => {
    const workflows = [{ id: projectId, userId: applicationUserId, name: "Morning review", status: "paused" }];
    vi.spyOn(db, "listScheduledWorkflowsForUser").mockResolvedValue(workflows as never);

    const result = await appRouter.createCaller(createContext("app_session_id=decoded-session; other=value")).scheduled.list();

    expect(db.listScheduledWorkflowsForUser).toHaveBeenCalledWith(applicationUserId);
    expect(result).toEqual({ available: false, workflows });
  });

  it("returns the durable event replay already ordered by the owned task data contract", async () => {
    const task = { id: projectId, userId: applicationUserId, status: "running" };
    const events = [{ id: "event-1", sequenceNumber: 1 }, { id: "event-2", sequenceNumber: 2 }];
    vi.spyOn(db, "getTaskForUser").mockResolvedValue(task as never);
    vi.spyOn(db, "listTaskEvents").mockResolvedValue(events as never);
    vi.spyOn(db, "listTaskAttachments").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskMessages").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskApprovals").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskDeliverables").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskSandboxes").mockResolvedValue([] as never);
    vi.spyOn(db, "getTaskSkillSelectionsForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskProofRecordsForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskPipelineHealthSignalsForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskRemediationProposalsForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskDelegationsForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskBrowserChangeSetsForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listPendingTaskLessonsForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskEvaluationPacksForUser").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskEvaluationResultsForUser").mockResolvedValue([] as never);

    const result = await appRouter.createCaller(createContext()).tasks.get({ taskId: projectId });

    expect(db.listTaskEvents).toHaveBeenCalledWith(projectId);
    expect(result.events.map(event => event.sequenceNumber)).toEqual([1, 2]);
  });

  it("records a rejected approval without resuming or re-queuing the protected task", async () => {
    const approvalId = "22222222-2222-4222-8222-222222222222";
    vi.spyOn(db, "getTaskForUser").mockResolvedValue({ id: projectId, userId: 7, status: "needs_input" } as never);
    vi.spyOn(db, "resolveApprovalForTask").mockResolvedValue({ id: "event-3", sequenceNumber: 3 } as never);
    const updateTask = vi.spyOn(db, "updateTaskForUser");
    const appendEvent = vi.spyOn(db, "appendTaskEvent");

    const result = await appRouter.createCaller(createContext()).approvals.resolve({ taskId: projectId, approvalId, decision: "rejected" });

    expect(db.resolveApprovalForTask).toHaveBeenCalledWith({ taskId: projectId, approvalId, decision: "rejected" });
    expect(updateTask).not.toHaveBeenCalled();
    expect(appendEvent).not.toHaveBeenCalled();
    expect(result).toMatchObject({ executionQueued: false });
  });
});
