import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import * as artifactStorage from "./agent/artifactStorage";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const taskId = "11111111-1111-4111-8111-111111111111";
const deliverableId = "22222222-2222-4222-8222-222222222222";
const applicationUserId = 10;

function createContext(): TrpcContext {
  return {
    user: {
      id: applicationUserId,
      openId: "artifact-owner",
      name: "Artifact Owner",
      email: "owner@example.test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("tasks.artifactUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes a deliverable URL only after verifying task ownership", async () => {
    vi.spyOn(db, "getTaskForUser").mockResolvedValue({ id: taskId, userId: applicationUserId } as never);
    vi.spyOn(db, "listTaskDeliverables").mockResolvedValue([
      {
        id: deliverableId,
        taskId,
        filename: "report.md",
        fileType: "text/markdown",
        storageKey: `tasks/${taskId}/report.md`,
      },
    ] as never);
    vi.spyOn(artifactStorage, "getTaskArtifactUrl").mockResolvedValue("https://storage.example.test/refreshed-report");

    const result = await appRouter.createCaller(createContext()).tasks.artifactUrl({ taskId, deliverableId });

    expect(db.getTaskForUser).toHaveBeenCalledWith(taskId, applicationUserId);
    expect(artifactStorage.getTaskArtifactUrl).toHaveBeenCalledWith(`tasks/${taskId}/report.md`);
    expect(result).toEqual({
      filename: "report.md",
      fileType: "text/markdown",
      url: "https://storage.example.test/refreshed-report",
    });
  });

  it("does not resolve an artifact outside the caller's owned task", async () => {
    vi.spyOn(db, "getTaskForUser").mockResolvedValue(undefined);
    const getUrl = vi.spyOn(artifactStorage, "getTaskArtifactUrl");

    await expect(appRouter.createCaller(createContext()).tasks.artifactUrl({ taskId, deliverableId }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(getUrl).not.toHaveBeenCalled();
  });
});
