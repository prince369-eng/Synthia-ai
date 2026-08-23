import { beforeEach, describe, expect, it, vi } from "vitest";

const db = { appendTaskEvent: vi.fn(), updateTaskForWorker: vi.fn() };
vi.mock("../db", () => db);

beforeEach(() => vi.clearAllMocks());

describe("exhausted worker retries", () => {
  it("leaves a task recoverable before the configured retry count is exhausted", async () => {
    const { persistExhaustedWorkerFailure } = await import("./workerFailure");
    const persisted = await persistExhaustedWorkerFailure({ data: { taskId: "task-1" }, attemptsMade: 2, opts: { attempts: 3 } }, new Error("transient provider error"));
    expect(persisted).toBe(false);
    expect(db.updateTaskForWorker).not.toHaveBeenCalled();
    expect(db.appendTaskEvent).not.toHaveBeenCalled();
  });

  it("records a durable terminal task outcome after the final retry fails", async () => {
    const { persistExhaustedWorkerFailure } = await import("./workerFailure");
    const privateFailure = "provider unavailable at https://internal.example.test?token=secret";
    const persisted = await persistExhaustedWorkerFailure({ data: { taskId: "task-1" }, attemptsMade: 3, opts: { attempts: 3 } }, new Error(privateFailure));
    expect(persisted).toBe(true);
    expect(db.updateTaskForWorker).toHaveBeenCalledWith("task-1", expect.objectContaining({
      status: "failed",
      failedReason: "The task ended after all retry attempts. Review the task and try again.",
    }));
    expect(db.appendTaskEvent).toHaveBeenCalledWith("task-1", expect.objectContaining({ type: "status_change", payload: expect.objectContaining({ status: "failed" }) }));
    expect(JSON.stringify(db.updateTaskForWorker.mock.calls)).not.toContain(privateFailure);
  });
});
