import { appendTaskEvent, updateTaskForWorker } from "../db";

export type FailedAgentJob = {
  data: { taskId: string };
  attemptsMade: number;
  opts: { attempts?: number };
};

export async function persistExhaustedWorkerFailure(job: FailedAgentJob | undefined, error: Error) {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return false;
  const summary = "Task could not recover after all worker retries.";
  const failedReason = "The task ended after all retry attempts. Review the task and try again.";
  await updateTaskForWorker(job.data.taskId, {
    status: "failed",
    currentStepSummary: summary,
    failedReason,
    completedAt: new Date(),
  });
  await appendTaskEvent(job.data.taskId, { type: "status_change", payload: { status: "failed", summary } });
  return true;
}
