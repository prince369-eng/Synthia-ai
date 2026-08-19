import { createAgentWorker } from "./queue";
import { runTaskCycle } from "./taskRunner";
import { logger } from "../security/logger";
import { persistExhaustedWorkerFailure } from "./workerFailure";

const worker = createAgentWorker(async job => runTaskCycle(job.data.taskId));

worker.on("failed", async (job, error) => {
  logger.error({ event: "agent_job_failed", taskId: job?.data.taskId, err: error }, "Agent job failed");
  await persistExhaustedWorkerFailure(job, error);
});

worker.on("error", error => {
  logger.error({ event: "agent_worker_error", err: error }, "Agent worker error");
});

async function stop(signal: string) {
  logger.info({ event: "agent_worker_shutdown", signal }, "Agent worker shutting down");
  await worker.close();
  process.exit(0);
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
