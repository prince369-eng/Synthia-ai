import { ENV } from "../_core/env";

export type LlmProviderName = "groq" | "openrouter" | "gemini" | "deepseek";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type LlmResponse = {
  provider: LlmProviderName;
  model: string;
  content: string;
  usage: LlmUsage;
  rawResponseId?: string;
};

export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly provider: LlmProviderName,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

function keyForProvider(provider: LlmProviderName) {
  const keys: Record<LlmProviderName, string> = {
    groq: ENV.groqApiKey,
    openrouter: ENV.openRouterApiKey,
    gemini: ENV.geminiApiKey,
    deepseek: ENV.deepseekApiKey,
  };
  return keys[provider];
}

function configuredModel(provider: LlmProviderName, model?: string) {
  if (model) return model;
  if (provider === ENV.orchestratorProvider && ENV.orchestratorModel) return ENV.orchestratorModel;
  if (provider === ENV.subtaskProvider && ENV.subtaskModel) return ENV.subtaskModel;
  throw new LlmProviderError(`No model is configured for ${provider}.`, provider, false);
}

function toUsage(value: unknown): LlmUsage {
  const usage = (value ?? {}) as Record<string, unknown>;
  const inputTokens = Number(usage.prompt_tokens ?? usage.promptTokenCount ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? usage.candidatesTokenCount ?? 0);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
    totalTokens: Number(usage.total_tokens ?? usage.totalTokenCount ?? inputTokens + outputTokens) || inputTokens + outputTokens,
  };
}

function nonEmptyContent(content: unknown) {
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    return content
      .map(item => (typeof item === "object" && item && "text" in item ? String(item.text ?? "") : ""))
      .join("\n")
      .trim();
  }
  return "";
}

async function parseJsonResponse(provider: LlmProviderName, response: Response) {
  const body = await response.text();
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new LlmProviderError(`${provider} returned ${response.status}: ${body.slice(0, 800)}`, provider, retryable);
  }
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new LlmProviderError(`${provider} returned invalid JSON.`, provider, true);
  }
}

async function requestOpenAiCompatible(input: {
  provider: "groq" | "openrouter" | "deepseek";
  model: string;
  messages: LlmMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const urls = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    deepseek: "https://api.deepseek.com/chat/completions",
  } as const;
  const apiKey = keyForProvider(input.provider);
  if (!apiKey) throw new LlmProviderError(`${input.provider} is not configured.`, input.provider, false);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (input.provider === "openrouter") {
    if (ENV.openRouterHttpReferer) headers["HTTP-Referer"] = ENV.openRouterHttpReferer;
    headers["X-Title"] = ENV.openRouterAppName;
  }
  const response = await fetch(urls[input.provider], {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const body = await parseJsonResponse(input.provider, response);
  const choices = body.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const content = nonEmptyContent(message?.content);
  if (!content) throw new LlmProviderError(`${input.provider} returned an empty completion.`, input.provider, true);
  return {
    provider: input.provider,
    model: input.model,
    content,
    usage: toUsage(body.usage),
    rawResponseId: typeof body.id === "string" ? body.id : undefined,
  } satisfies LlmResponse;
}

async function requestGemini(input: { model: string; messages: LlmMessage[]; temperature: number; maxTokens: number }) {
  if (!ENV.geminiApiKey) throw new LlmProviderError("gemini is not configured.", "gemini", false);
  const systemText = input.messages.filter(message => message.role === "system").map(message => message.content).join("\n\n");
  const contents = input.messages
    .filter(message => message.role !== "system")
    .map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
        generationConfig: { temperature: input.temperature, maxOutputTokens: input.maxTokens, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  const body = await parseJsonResponse("gemini", response);
  const candidates = body.candidates as Array<Record<string, unknown>> | undefined;
  const candidateContent = candidates?.[0]?.content as Record<string, unknown> | undefined;
  const parts = candidateContent?.parts as Array<Record<string, unknown>> | undefined;
  const content = parts?.map(part => String(part.text ?? "")).join("\n").trim() ?? "";
  if (!content) throw new LlmProviderError("gemini returned an empty completion.", "gemini", true);
  return {
    provider: "gemini",
    model: input.model,
    content,
    usage: toUsage(body.usageMetadata),
    rawResponseId: typeof body.responseId === "string" ? body.responseId : undefined,
  } satisfies LlmResponse;
}

export async function generateCompletion(input: {
  provider: LlmProviderName;
  model?: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const model = configuredModel(input.provider, input.model);
  const request = { model, messages: input.messages, temperature: input.temperature ?? 0.2, maxTokens: input.maxTokens ?? 2_000 };
  return input.provider === "gemini"
    ? requestGemini(request)
    : requestOpenAiCompatible({ provider: input.provider, ...request });
}

export async function generateWithFallback(input: {
  purpose: "orchestrator" | "subtask";
  messages: LlmMessage[];
  maxTokens?: number;
}) {
  const preferred = (input.purpose === "orchestrator" ? ENV.orchestratorProvider : ENV.subtaskProvider) as LlmProviderName;
  const preferredModel = input.purpose === "orchestrator" ? ENV.orchestratorModel : ENV.subtaskModel;
  const providerOrder = [preferred, "openrouter", "groq", "gemini", "deepseek"] as LlmProviderName[];
  const attempted = new Set<LlmProviderName>();
  const errors: string[] = [];
  for (const provider of providerOrder) {
    if (attempted.has(provider) || !keyForProvider(provider)) continue;
    attempted.add(provider);
    try {
      return await generateCompletion({
        provider,
        model: provider === preferred ? preferredModel || undefined : undefined,
        messages: input.messages,
        maxTokens: input.maxTokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error.";
      errors.push(message);
      if (!(error instanceof LlmProviderError) || !error.retryable) continue;
    }
  }
  throw new Error(`No configured model provider completed the request. ${errors.join(" | ")}`);
}

export function parseStructuredModelOutput<T>(content: string): T {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content;
  try {
    return JSON.parse(fenced.trim()) as T;
  } catch {
    throw new Error("The model did not return valid JSON.");
  }
}
