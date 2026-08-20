const timeout = (milliseconds = 15_000) => AbortSignal.timeout(milliseconds);

async function jsonRequest(url, headers) {
  const response = await fetch(url, { headers, signal: timeout() });
  if (!response.ok) {
    throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}`);
  }
  return response.json();
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

function numeric(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function inspectGroq(apiKey) {
  const payload = await jsonRequest("https://api.groq.com/openai/v1/models", {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  });
  const models = Array.isArray(payload?.data) ? payload.data : [];
  return {
    credentialAccepted: true,
    catalog: {
      accessibleModelCount: models.length,
      sampleModelIds: models.slice(0, 12).map((model) => model?.id).filter((id) => typeof id === "string"),
    },
    usage: {
      available: false,
      reason: "Groq exposes exact organization rate limits in its Console; remaining request and token counters are returned on inference response headers, so this read-only audit does not manufacture a usage number.",
    },
  };
}

async function inspectOpenRouter(apiKey) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const [modelsPayload, creditsPayload, keyPayload] = await Promise.all([
    jsonRequest("https://openrouter.ai/api/v1/models", headers),
    jsonRequest("https://openrouter.ai/api/v1/credits", headers),
    jsonRequest("https://openrouter.ai/api/v1/key", headers),
  ]);
  const models = Array.isArray(modelsPayload?.data) ? modelsPayload.data : [];
  const freeModels = models.filter((model) =>
    typeof model?.id === "string" &&
    (model.id.endsWith(":free") ||
      (model?.pricing?.prompt === "0" && model?.pricing?.completion === "0")),
  );
  const totalCredits = numeric(creditsPayload?.data?.total_credits);
  const totalUsage = numeric(creditsPayload?.data?.total_usage);
  return {
    credentialAccepted: true,
    catalog: {
      accessibleModelCount: models.length,
      advertisedFreeModelCount: freeModels.length,
      sampleFreeModelIds: freeModels.slice(0, 12).map((model) => model.id),
    },
    usage: {
      reportedTotalCredits: totalCredits,
      reportedTotalUsage: totalUsage,
      perKeyLimitRemaining: numeric(keyPayload?.data?.limit_remaining),
      perKeyLimitReset: typeof keyPayload?.data?.limit_reset === "string" ? keyPayload.data.limit_reset : null,
    },
  };
}

async function inspectGemini(apiKey) {
  const payload = await jsonRequest("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
    "x-goog-api-key": apiKey,
  });
  const models = Array.isArray(payload?.models) ? payload.models : [];
  return {
    credentialAccepted: true,
    catalog: {
      accessibleModelCount: models.length,
      sampleModelIds: models.slice(0, 12).map((model) => model?.baseModelId ?? model?.name).filter((id) => typeof id === "string"),
      generationMethods: [...new Set(models.flatMap((model) => asStringArray(model?.supportedGenerationMethods)))].sort(),
    },
    usage: {
      available: false,
      reason: "The Gemini models endpoint confirms key access and capability metadata but does not expose account-specific remaining quota. Consult Google AI Studio Dashboard > Usage and Rate Limit pages for the project’s live tier and quota.",
    },
  };
}

const audit = {};
const checks = [
  ["groq", process.env.GROQ_API_KEY, inspectGroq],
  ["openrouter", process.env.OPENROUTER_API_KEY, inspectOpenRouter],
  ["gemini", process.env.GEMINI_API_KEY, inspectGemini],
];

for (const [provider, apiKey, inspect] of checks) {
  if (!apiKey) {
    audit[provider] = { credentialAccepted: false, error: "Credential is not available in this process." };
    continue;
  }
  try {
    audit[provider] = await inspect(apiKey);
  } catch (error) {
    audit[provider] = {
      credentialAccepted: false,
      error: error instanceof Error ? error.message : "Unknown read-only provider audit failure.",
    };
  }
}

console.log(JSON.stringify(audit, null, 2));
