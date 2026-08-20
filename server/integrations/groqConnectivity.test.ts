import { describe, expect, it } from "vitest";

const groqApiKey = process.env.GROQ_API_KEY;
const canRun =
  process.env.SYNTHIA_RUN_LIVE_GROQ_CONNECTIVITY_CHECK === "true" &&
  Boolean(groqApiKey);

describe.runIf(canRun)("configured Groq integration", () => {
  it("accepts the credential on the non-generative models endpoint", async () => {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.status, "Groq rejected the configured credential or request").toBeGreaterThanOrEqual(200);
    expect(response.status, "Groq rejected the configured credential or request").toBeLessThan(300);

    const payload: unknown = await response.json();
    expect(payload).toMatchObject({ data: expect.any(Array) });
  }, 20_000);
});
