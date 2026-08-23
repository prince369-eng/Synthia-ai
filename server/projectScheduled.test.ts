import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import * as rateLimit from "./security/rateLimit";
import * as queue from "./agent/queue";
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
