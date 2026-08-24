import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../_core/env";
import { generateWithFallback, isConfiguredVisionModel, LlmRouteUnavailableError, LlmStructuredOutputError, parseStructuredModelOutput } from "./llm";

const environmentSnapshot = {
  groqApiKey: ENV.groqApiKey,
  agnesApiKey: ENV.agnesApiKey,
  aihubmixApiKey: ENV.aihubmixApiKey,
  agnesBaseUrl: ENV.agnesBaseUrl,
  aihubmixBaseUrl: ENV.aihubmixBaseUrl,
  openRouterApiKey: ENV.openRouterApiKey,
  orchestratorProvider: ENV.orchestratorProvider,
  orchestratorModel: ENV.orchestratorModel,
  visionModels: [...ENV.visionModels],
};

afterEach(() => {
  ENV.groqApiKey = environmentSnapshot.groqApiKey;
  ENV.agnesApiKey = environmentSnapshot.agnesApiKey;
  ENV.aihubmixApiKey = environmentSnapshot.aihubmixApiKey;
  ENV.agnesBaseUrl = environmentSnapshot.agnesBaseUrl;
  ENV.aihubmixBaseUrl = environmentSnapshot.aihubmixBaseUrl;
  ENV.openRouterApiKey = environmentSnapshot.openRouterApiKey;
  ENV.orchestratorProvider = environmentSnapshot.orchestratorProvider;
  ENV.orchestratorModel = environmentSnapshot.orchestratorModel;
  ENV.visionModels = [...environmentSnapshot.visionModels];
  vi.unstubAllGlobals();
});

describe("structured model output parsing", () => {
  it("accepts direct JSON agent decisions", () => {
    expect(parseStructuredModelOutput<{ narration: string }>(`{"narration":"Inspecting the task."}`)).toEqual({ narration: "Inspecting the task." });
  });

  it("accepts JSON fenced by a provider despite the JSON-only instruction", () => {
    expect(parseStructuredModelOutput<{ action: { kind: string } }>("```json\n{\"action\":{\"kind\":\"complete\"}}\n```"))
      .toEqual({ action: { kind: "complete" } });
  });

  it("rejects malformed model content before action validation", () => {
    expect(() => parseStructuredModelOutput("this is not JSON")).toThrow(LlmStructuredOutputError);
  });

  it("honors a selected model then falls back to the next configured provider after a retryable failure", async () => {
    ENV.groqApiKey = "groq-test-key";
    ENV.openRouterApiKey = "openrouter-test-key";
    ENV.orchestratorProvider = "openrouter";
    ENV.orchestratorModel = "fallback-model";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "fallback-response",
        choices: [{ message: { content: "{\"action\":{\"kind\":\"complete\"}}" } }],
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateWithFallback({
      purpose: "orchestrator",
      selectedModel: { provider: "groq", model: "selected-model" },
      messages: [{ role: "user", content: "Return a structured agent action." }],
    });

    expect(response).toMatchObject({ provider: "openrouter", model: "fallback-model", usage: { totalTokens: 14 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ model: "selected-model" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ model: "fallback-model" });
  });

  it("returns a bounded unavailable-route error after configured provider routes are unavailable", async () => {
    ENV.aihubmixApiKey = "aihubmix-test-key";
    ENV.orchestratorProvider = "aihubmix";
    ENV.orchestratorModel = "free-model";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "no_available_channel" } }), { status: 400 })));

    await expect(generateWithFallback({
      purpose: "orchestrator",
      messages: [{ role: "user", content: "Return a structured agent action." }],
    })).rejects.toBeInstanceOf(LlmRouteUnavailableError);
  });

  it("switches only through allowlisted automatic candidates after a rate-limited route", async () => {
    ENV.groqApiKey = "groq-test-key";
    ENV.openRouterApiKey = "openrouter-test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "automatic-fallback-response",
        choices: [{ message: { content: "{\"action\":{\"kind\":\"complete\"}}" } }],
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateWithFallback({
      purpose: "orchestrator",
      candidateModels: [
        { provider: "groq", model: "first-automatic-model" },
        { provider: "openrouter", model: "second-automatic-model" },
      ],
      messages: [{ role: "user", content: "Return a structured agent action." }],
    });

    expect(response).toMatchObject({ provider: "openrouter", model: "second-automatic-model" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ model: "first-automatic-model" });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ model: "second-automatic-model" });
  });

  it("converts a failed single automatic candidate into a bounded unavailable-route error", async () => {
    ENV.groqApiKey = "groq-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "temporary upstream failure" }), { status: 503 })));

    await expect(generateWithFallback({
      purpose: "orchestrator",
      candidateModels: [{ provider: "groq", model: "automatic-model" }],
      messages: [{ role: "user", content: "Return a structured agent action." }],
    })).rejects.toBeInstanceOf(LlmRouteUnavailableError);
  });

  it("sends image parts only through a model explicitly configured for vision", async () => {
    ENV.openRouterApiKey = "openrouter-test-key";
    ENV.visionModels = ["openrouter:vision-model"];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "vision-response",
      choices: [{ message: { content: "{\"action\":{\"kind\":\"complete\"}}" } }],
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(isConfiguredVisionModel({ provider: "openrouter", model: "vision-model" })).toBe(true);
    expect(isConfiguredVisionModel({ provider: "openrouter", model: "text-model" })).toBe(false);

    await generateWithFallback({
      purpose: "orchestrator",
      selectedModel: { provider: "openrouter", model: "vision-model" },
      messages: [{ role: "user", content: [
        { type: "text", text: "Inspect this image." },
        { type: "image", mimeType: "image/png", dataBase64: "aW1hZ2UtYnl0ZXM=" },
      ] }],
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      model: "vision-model",
      messages: [{ role: "user", content: [
        { type: "text", text: "Inspect this image." },
        { type: "image_url", image_url: { url: "data:image/png;base64,aW1hZ2UtYnl0ZXM=" } },
      ] }],
    });
  });

  it("routes explicitly selected AIHubMix and Agnes models through their documented OpenAI-compatible endpoints", async () => {
    ENV.aihubmixApiKey = "aihubmix-test-key";
    ENV.agnesApiKey = "agnes-test-key";
    ENV.aihubmixBaseUrl = "https://aihubmix.example.test/v1";
    ENV.agnesBaseUrl = "https://agnes.example.test/v1";
    const fetchMock = vi.fn().mockImplementation(() => new Response(JSON.stringify({
      id: "provider-response",
      choices: [{ message: { content: "{\"action\":{\"kind\":\"complete\"}}" } }],
      usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const aihubmix = await generateWithFallback({
      purpose: "orchestrator",
      selectedModel: { provider: "aihubmix", model: "free-text-model" },
      messages: [{ role: "user", content: "Return one JSON action." }],
    });
    const agnes = await generateWithFallback({
      purpose: "orchestrator",
      selectedModel: { provider: "agnes", model: "agnes-2.0-flash" },
      messages: [{ role: "user", content: "Return one JSON action." }],
    });

    expect(aihubmix.provider).toBe("aihubmix");
    expect(agnes.provider).toBe("agnes");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://aihubmix.example.test/v1/chat/completions");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://agnes.example.test/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer aihubmix-test-key" });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: "Bearer agnes-test-key" });
  });
});
