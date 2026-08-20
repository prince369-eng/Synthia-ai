import { describe, expect, it } from "vitest";

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

const canRunOpenRouter =
  process.env.SYNTHIA_RUN_LIVE_OPENROUTER_CONNECTIVITY_CHECK === "true" &&
  Boolean(openRouterApiKey);

const canRunGemini =
  process.env.SYNTHIA_RUN_LIVE_GEMINI_CONNECTIVITY_CHECK === "true" &&
  Boolean(geminiApiKey);

type OpenRouterModel = {
  id?: unknown;
  pricing?: { prompt?: unknown; completion?: unknown };
};

describe.runIf(canRunOpenRouter)("configured OpenRouter integration", () => {
  it("accepts the credential on read-only model and credit endpoints", async () => {
    const headers = {
      Authorization: `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
    };

    const [modelsResponse, creditsResponse] = await Promise.all([
      fetch("https://openrouter.ai/api/v1/models", {
        headers,
        signal: AbortSignal.timeout(15_000),
      }),
      fetch("https://openrouter.ai/api/v1/credits", {
        headers,
        signal: AbortSignal.timeout(15_000),
      }),
    ]);

    expect(modelsResponse.status, "OpenRouter rejected the configured model-catalog request").toBeGreaterThanOrEqual(200);
    expect(modelsResponse.status, "OpenRouter rejected the configured model-catalog request").toBeLessThan(300);
    expect(creditsResponse.status, "OpenRouter rejected the configured read-only credit request").toBeGreaterThanOrEqual(200);
    expect(creditsResponse.status, "OpenRouter rejected the configured read-only credit request").toBeLessThan(300);

    const modelsPayload: unknown = await modelsResponse.json();
    const creditsPayload: unknown = await creditsResponse.json();
    expect(modelsPayload).toMatchObject({ data: expect.any(Array) });
    expect(creditsPayload).toMatchObject({ data: expect.any(Object) });

    const models = (modelsPayload as { data: OpenRouterModel[] }).data;
    const freeModels = models.filter((model) =>
      typeof model.id === "string" &&
      (model.id.endsWith(":free") ||
        (model.pricing?.prompt === "0" && model.pricing?.completion === "0")),
    );

    expect(freeModels.length, "OpenRouter returned no advertised no-cost models for this catalog").toBeGreaterThan(0);
  }, 20_000);
});

describe.runIf(canRunGemini)("configured Gemini integration", () => {
  it("accepts the credential on the read-only model-list endpoint", async () => {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": geminiApiKey! },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.status, "Gemini rejected the configured model-list request").toBeGreaterThanOrEqual(200);
    expect(response.status, "Gemini rejected the configured model-list request").toBeLessThan(300);

    const payload: unknown = await response.json();
    expect(payload).toMatchObject({ models: expect.any(Array) });
    expect((payload as { models: unknown[] }).models.length).toBeGreaterThan(0);
  }, 20_000);
});
