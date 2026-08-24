import { Queue, Worker, type Processor } from "bullmq";
import IORedis from "ioredis";
import { ENV } from "../_core/env";

export type AgentJob = { taskId: string };

const QUEUE_NAME = "synthia-agent-cycles";
let queue: Queue<AgentJob> | undefined;

/** BullMQ forbids ':' in user-supplied job IDs. */
export function agentCycleJobId(taskId: string, suffix = crypto.randomUUID()) {
  return `${taskId}-${suffix}`;
}

function redisConnection() {
  if (!ENV.redisUrl) throw new Error("REDIS_URL is required before task execution can be queued.");
  return new IORedis(ENV.redisUrl, {
    maxRetriesPerRequest: null,
    tls: ENV.redisTlsEnabled ? {} : undefined,
    enableReadyCheck: true,
  });
}

export function isQueueConfigured() {
  return Boolean(ENV.redisUrl);
}

export function taskQueue() {
  if (!queue) queue = new Queue<AgentJob>(QUEUE_NAME, { connection: redisConnection() });
  return queue;
}

export async function enqueueTaskCycle(taskId: string, delayMs = 0) {
  if (!isQueueConfigured()) return false;
  await taskQueue().add("agent-cycle", { taskId }, {
    jobId: agentCycleJobId(taskId),
    delay: delayMs,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 2_000 },
    removeOnFail: { count: 10_000 },
  });
  return true;
}

export function createAgentWorker(processor: Processor<AgentJob>) {
  return new Worker<AgentJob>(QUEUE_NAME, processor, {
    connection: redisConnection(),
    concurrency: 2,
    lockDuration: 120_000,
  });
}
