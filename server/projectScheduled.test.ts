import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import * as heartbeat from "./_core/heartbeat";
import * as rateLimit from "./security/rateLimit";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const projectId = "11111111-1111-4111-8111-111111111111";

function createContext(cookie = "app_session_id=user-session-token"): TrpcContext {
  return {
    user: {
      id: 7,
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
    const created = { id: projectId, userId: 7, name: "Website launch", description: "Prepare launch work." };
    vi.spyOn(db, "createProjectForUser").mockResolvedValue(created as never);

    const result = await appRouter.createCaller(createContext()).projects.create({
      name: "Website launch",
      description: "Prepare launch work.",
    });

    expect(db.createProjectForUser).toHaveBeenCalledWith({
      userId: 7,
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

  it("forwards only the caller's decoded session to scheduled-job listing", async () => {
    const listed = { total: 1, actorUserId: "project-owner", jobs: [] };
    vi.spyOn(heartbeat, "listHeartbeatJobs").mockResolvedValue(listed);

    const result = await appRouter.createCaller(createContext("app_session_id=decoded-session; other=value")).scheduled.list();

    expect(heartbeat.listHeartbeatJobs).toHaveBeenCalledWith("decoded-session", { page: 1, pageSize: 50 });
    expect(result).toEqual(listed);
  });

  it("returns the durable event replay already ordered by the owned task data contract", async () => {
    const task = { id: projectId, userId: 7, status: "running" };
    const events = [{ id: "event-1", sequenceNumber: 1 }, { id: "event-2", sequenceNumber: 2 }];
    vi.spyOn(db, "getTaskForUser").mockResolvedValue(task as never);
    vi.spyOn(db, "listTaskEvents").mockResolvedValue(events as never);
    vi.spyOn(db, "listTaskMessages").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskApprovals").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskDeliverables").mockResolvedValue([] as never);
    vi.spyOn(db, "listTaskSandboxes").mockResolvedValue([] as never);

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
