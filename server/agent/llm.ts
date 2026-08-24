import { ENV } from "../_core/env";

export type LlmProviderName = "groq" | "agnes" | "aihubmix" | "openrouter" | "gemini" | "deepseek";

export type LlmContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: "image/png" | "image/jpeg" | "image/webp"; dataBase64: string };

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string | LlmContentPart[];
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
    readonly availability: "rate_limited" | "route_unavailable" | null = null,
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export class LlmRouteUnavailableError extends Error {
  constructor() {
    super("No configured model route is currently available.");
    this.name = "LlmRouteUnavailableError";
  }
}

export class LlmStructuredOutputError extends Error {
  constructor() {
    super("The model did not return a usable structured planning response.");
    this.name = "LlmStructuredOutputError";
  }
}

function keyForProvider(provider: LlmProviderName) {
  const keys: Record<LlmProviderName, string> = {
    groq: ENV.groqApiKey,
    agnes: ENV.agnesApiKey,
    aihubmix: ENV.aihubmixApiKey,
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

function textFromContent(content: LlmMessage["content"]) {
  return typeof content === "string"
    ? content
    : content.filter((part): part is Extract<LlmContentPart, { type: "text" }> => part.type === "text").map(part => part.text).join("\n");
}

function openAiContent(content: LlmMessage["content"]) {
  if (typeof content === "string") return content;
  return content.map(part => part.type === "text"
    ? { type: "text", text: part.text }
    : { type: "image_url", image_url: { url: `data:${part.mimeType};base64,${part.dataBase64}` } });
}

function geminiParts(content: LlmMessage["content"]) {
  const parts = typeof content === "string" ? [{ type: "text" as const, text: content }] : content;
  return parts.map(part => part.type === "text"
    ? { text: part.text }
    : { inlineData: { mimeType: part.mimeType, data: part.dataBase64 } });
}

export function isConfiguredVisionModel(model: { provider: LlmProviderName; model: string } | undefined) {
  return Boolean(model && ENV.visionModels.includes(`${model.provider}:${model.model}`));
}

export function boundedLlmProviderFailureMessage(provider: LlmProviderName, status: number) {
  return `${provider} returned HTTP ${status}.`;
}

async function parseJsonResponse(provider: LlmProviderName, response: Response) {
  const body = await response.text();
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    const normalizedBody = body.toLowerCase();
    const availability = response.status === 429
      ? "rate_limited"
      : normalizedBody.includes("no_available_channel") || normalizedBody.includes("cannot be routed")
        ? "route_unavailable"
        : null;
    throw new LlmProviderError(boundedLlmProviderFailureMessage(provider, response.status), provider, retryable, availability);
  }
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new LlmProviderError(`${provider} returned invalid JSON.`, provider, true);
  }
}

async function requestOpenAiCompatible(input: {
  provider: "groq" | "agnes" | "aihubmix" | "openrouter" | "deepseek";
  model: string;
  messages: LlmMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const urls = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    agnes: `${ENV.agnesBaseUrl.replace(/\/$/, "")}/chat/completions`,
    aihubmix: `${ENV.aihubmixBaseUrl.replace(/\/$/, "")}/chat/completions`,
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
      messages: input.messages.map(message => ({ ...message, content: openAiContent(message.content) })),
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
  const systemText = input.messages.filter(message => message.role === "system").map(message => textFromContent(message.content)).join("\n\n");
  const contents = input.messages
    .filter(message => message.role !== "system")
    .map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: geminiParts(message.content) }));
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
  selectedModel?: { provider: LlmProviderName; model: string };
  /**
   * When automatic routing supplies explicit candidates, try only these
   * provider/model pairs in order. This prevents a manual selection from being
   * silently substituted and keeps every automatic switch allowlisted.
   */
  candidateModels?: Array<{ provider: LlmProviderName; model: string }>;
}) {
  const preferred = (input.selectedModel?.provider ?? (input.purpose === "orchestrator" ? ENV.orchestratorProvider : ENV.subtaskProvider)) as LlmProviderName;
  const preferredModel = input.selectedModel?.model ?? (input.purpose === "orchestrator" ? ENV.orchestratorModel : ENV.subtaskModel);
  const fallbackProviderOrder = [preferred, "openrouter", "groq", "gemini", "deepseek", "aihubmix", "agnes"] as LlmProviderName[];
  const explicitCandidates = input.candidateModels?.length
    ? input.candidateModels
    : fallbackProviderOrder.map(provider => ({ provider, model: provider === preferred ? preferredModel : undefined }));
  const attempted = new Set<string>();
  const errorKinds = new Set<string>();
  let unavailableRoute = false;
  for (const candidate of explicitCandidates) {
    const provider = candidate.provider;
    const attemptedId = `${provider}:${candidate.model ?? "default"}`;
    if (attempted.has(attemptedId) || !keyForProvider(provider)) continue;
    attempted.add(attemptedId);
    try {
      return await generateCompletion({
        provider,
        model: candidate.model || undefined,
        messages: input.messages,
        maxTokens: input.maxTokens,
      });
    } catch (error) {
      const errorKind = error instanceof Error && error.name ? error.name : "unknown_provider_error";
      errorKinds.add(errorKind);
      // Task routing passes one explicit candidate at a time. Treat every
      // transport or provider failure on that bounded route as unavailable so
      // the worker never falls through to its generic retry path before an
      // agent action has happened.
      if (input.candidateModels?.length) unavailableRoute = true;
      if (error instanceof LlmProviderError) {
        if (error.availability) unavailableRoute = true;
        // Automatic routing invokes one allowlisted route at a time. Any
        // provider-level failure on that route is safe to classify as a route
        // unavailable for this cycle, allowing the planner to advance only to
        // the next compatible configured candidate before any agent action.
        if (error.retryable || error.availability || Boolean(input.candidateModels?.length)) continue;
      }
      // Default provider routing has historically continued through every
      // configured provider. Preserve that bounded behavior while automatic
      // routing remains limited to its explicit allowlisted candidates.
      continue;
    }
  }
  if (unavailableRoute) throw new LlmRouteUnavailableError();
  throw new Error(`No configured model provider completed the request (${Array.from(errorKinds).join(",") || "no_configured_provider"}).`);
}

export function parseStructuredModelOutput<T>(content: string): T {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content;
  try {
    return JSON.parse(fenced.trim()) as T;
  } catch {
    throw new LlmStructuredOutputError();
  }
}
