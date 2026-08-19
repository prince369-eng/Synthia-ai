import { appendTaskEvent, updateTaskForWorker } from "../db";

export type FailedAgentJob = {
  data: { taskId: string };
  attemptsMade: number;
  opts: { attempts?: number };
};

export async function persistExhaustedWorkerFailure(job: FailedAgentJob | undefined, error: Error) {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return false;
  const summary = "Task could not recover after all worker retries.";
  await updateTaskForWorker(job.data.taskId, {
    status: "failed",
    currentStepSummary: summary,
    failedReason: error.message.slice(0, 1_000),
    completedAt: new Date(),
  });
  await appendTaskEvent(job.data.taskId, { type: "status_change", payload: { status: "failed", summary } });
  return true;
}
