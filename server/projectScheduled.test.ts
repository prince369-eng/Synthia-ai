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
});
