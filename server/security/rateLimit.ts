import IORedis from "ioredis";
import { ENV } from "../_core/env";
import { logger } from "./logger";

export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Too many requests. Please retry shortly.");
    this.name = "RateLimitError";
  }
}

let client: IORedis | undefined;

function redis() {
  if (!ENV.redisUrl) return undefined;
  if (!client) {
    client = new IORedis(ENV.redisUrl, { maxRetriesPerRequest: 1, tls: ENV.redisTlsEnabled ? {} : undefined });
    client.on("error", error => logger.error({ event: "rate_limit_redis_error", err: error }, "Rate-limit Redis connection failed"));
  }
  return client;
}

export async function enforceRateLimit(input: { subject: string; scope: string; limit: number; windowSeconds: number }) {
  const redisClient = redis();
  if (!redisClient) {
    if (ENV.isProduction) throw new Error("Redis is required for production mutation rate limiting.");
    return;
  }
  const bucket = Math.floor(Date.now() / (input.windowSeconds * 1_000));
  const key = `synthia:rate:${input.scope}:${input.subject}:${bucket}`;
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.expire(key, input.windowSeconds + 1);
  if (count > input.limit) throw new RateLimitError(input.windowSeconds);
}
