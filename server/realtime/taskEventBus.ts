import IORedis from "ioredis";
import { ENV } from "../_core/env";
import { logger } from "../security/logger";

function channel(taskId: string) {
  return `synthia:task-events:${taskId}`;
}

let publisher: IORedis | undefined;

function redisErrorCategory(error: unknown) {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return "timeout";
  if (error instanceof TypeError) return "network";
  return "transport";
}

function createClient(role: "publisher" | "subscriber") {
  if (!ENV.redisUrl) return undefined;
  const client = new IORedis(ENV.redisUrl, {
    maxRetriesPerRequest: role === "publisher" ? 1 : null,
    tls: ENV.redisTlsEnabled ? {} : undefined,
  });
  client.on("error", error => logger.warn({ event: "task_event_bus_redis_error", role, errorCategory: redisErrorCategory(error) }, "Task-event Redis connection failed"));
  return client;
}

function eventPublisher() {
  if (!publisher) publisher = createClient("publisher");
  return publisher;
}

export function isTaskEventBusConfigured() {
  return Boolean(ENV.redisUrl);
}

export function publishTaskEvent(taskId: string, sequenceNumber: number) {
  const client = eventPublisher();
  if (!client) return;
  void client.publish(channel(taskId), String(sequenceNumber)).catch(error => {
    logger.warn({ event: "task_event_publish_failed", taskId, sequenceNumber, errorCategory: redisErrorCategory(error) }, "Task-event publish failed; stream recovery will poll the database");
  });
}

export function subscribeTaskEvents(taskId: string, onSequence: (sequenceNumber: number) => void) {
  const subscriber = createClient("subscriber");
  if (!subscriber) return () => undefined;
  const taskChannel = channel(taskId);
  subscriber.on("message", (receivedChannel, message) => {
    if (receivedChannel !== taskChannel) return;
    const sequenceNumber = Number(message);
    if (Number.isInteger(sequenceNumber) && sequenceNumber > 0) onSequence(sequenceNumber);
  });
  void subscriber.subscribe(taskChannel).catch(error => {
    logger.warn({ event: "task_event_subscribe_failed", taskId, errorCategory: redisErrorCategory(error) }, "Task-event subscription failed; stream recovery will poll the database");
  });
  return () => {
    void subscriber.unsubscribe(taskChannel).finally(() => subscriber.quit());
  };
}
