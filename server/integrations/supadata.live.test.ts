import { describe, expect, it } from "vitest";

const shouldRun = process.env.SYNTHIA_RUN_LIVE_PROVIDER === "1";

describe("Supadata credential preflight", () => {
  it.runIf(shouldRun)("accepts the configured server credential without creating a transcript or extraction job", async () => {
    const apiKey = process.env.SUPADATA_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.supadata.ai/v1/transcript", {
      headers: { "x-api-key": apiKey! },
    });

    // The intentionally incomplete request must be rejected for its missing URL,
    // not for authentication. It starts no transcript or AI-analysis workload.
    expect([401, 403]).not.toContain(response.status);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  }, 15_000);
});
