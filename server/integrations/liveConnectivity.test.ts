import IORedis from "ioredis";
import { describe, expect, it } from "vitest";

const tavilyKey = process.env.TAVILY_API_KEY;
const serperKey = process.env.SERPER_API_KEY;
const redisUrl = process.env.REDIS_URL;
const canRun = process.env.SYNTHIA_RUN_LIVE_INTEGRATION_CHECKS === "true" && Boolean(tavilyKey && serperKey && redisUrl);

describe.runIf(canRun)("configured live search and queue integrations", () => {
  it("accepts the Tavily credential for a lightweight search request", async () => {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: "Synthia AI integration validation",
        search_depth: "basic",
        max_results: 1,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.status, "Tavily rejected the configured credential or request").toBeGreaterThanOrEqual(200);
    expect(response.status, "Tavily rejected the configured credential or request").toBeLessThan(300);
  }, 20_000);

  it("accepts the Serper credential for a lightweight search request", async () => {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": serperKey ?? "" },
      body: JSON.stringify({ q: "Synthia AI integration validation", num: 1 }),
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.status, "Serper rejected the configured credential or request").toBeGreaterThanOrEqual(200);
    expect(response.status, "Serper rejected the configured credential or request").toBeLessThan(300);
  }, 20_000);

  it("accepts the Redis connection URL for a non-mutating ping", async () => {
    const connection = new IORedis(redisUrl!, {
      connectTimeout: 15_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    connection.on("error", () => undefined);

    try {
      await connection.connect();
      await expect(connection.ping()).resolves.toBe("PONG");
    } finally {
      connection.disconnect();
    }
  }, 20_000);
});
