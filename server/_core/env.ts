import { isPublicHostname } from "@shared/externalReference";

const list = (value?: string) =>
  (value ?? "")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);

export { isPublicHostname as isPublicConfiguredHostname } from "@shared/externalReference";

/**
 * Configuration allowlists accept only normalized domain names. They intentionally
 * exclude URL syntax, ports, IP literals, local names, and wildcard entries so the
 * downstream capability boundary cannot be broadened accidentally by an env value.
 */
export function publicHostnameAllowlist(value?: string) {
  return Array.from(new Set(list(value).map(host => host.replace(/\.$/, "")).filter(isPublicHostname)));
}

const modelList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

/** Public-web access is privileged capability configuration and must be explicit. */
export const isExplicitlyEnabled = (value?: string) => value === "true";

/**
 * Numeric process configuration is operator input, not an execution instruction.
 * Missing, fractional, non-finite, negative, and out-of-range values fall back or clamp
 * before reaching task safety caps or provider timeout requests.
 */
export function boundedPositiveInteger(
  value: string | undefined,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
) {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
}

/**
 * Provider endpoints are operator configuration, but many outbound clients attach API
 * credentials to them. Keep only canonical HTTPS bases: no embedded credentials,
 * query/fragment state, or non-standard port can alter the request target.
 */
export function safeProviderBaseUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !isPublicHostname(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""))
    ) return fallback;
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

/**
 * The browser Origin header never contains a path, query, fragment, or credentials.
 * Normalize the configured production origin to that same narrow shape before it can
 * expand credentialed CORS access.
 */
export function publicApplicationOrigin(value?: string): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !isPublicHostname(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""))
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Keep local browser origins available only for development CORS requests. */
export function corsAllowedOrigins({ publicAppUrl, isProduction }: { publicAppUrl?: string; isProduction: boolean }) {
  const configuredOrigin = publicApplicationOrigin(publicAppUrl);
  const developmentOrigins = isProduction ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"];
  return [configuredOrigin, ...developmentOrigins].filter((value): value is string => Boolean(value));
}

const APPROVED_FREE_MODELS = [
  "aihubmix:glm-5.2-free",
  "aihubmix:gemini-3.7-flash-free",
  "aihubmix:coding-glm-5.2-free",
  "aihubmix:coding-kimi-k3-free",
  "aihubmix:gpt-oss-20b-free",
  "agnes:agnes-2.0-flash",
];

/**
 * Non-secret, user-approved defaults. Environment values always override these
 * values so production operators can intentionally narrow a capability.
 */
export function configuredProviderDefaults(source: NodeJS.ProcessEnv = process.env) {
  const pixazoImageModels = modelList(source.PIXAZO_IMAGE_MODELS).length ? modelList(source.PIXAZO_IMAGE_MODELS) : ["flux"];
  const pixazoVideoModels = modelList(source.PIXAZO_VIDEO_MODELS).length ? modelList(source.PIXAZO_VIDEO_MODELS) : ["ltx"];
  const pixazoAudioModels = modelList(source.PIXAZO_AUDIO_MODELS).length ? modelList(source.PIXAZO_AUDIO_MODELS) : ["tracks"];
  const availableModels = modelList(source.SYNTHIA_AVAILABLE_MODELS).length ? modelList(source.SYNTHIA_AVAILABLE_MODELS) : APPROVED_FREE_MODELS;
  const visionModels = modelList(source.SYNTHIA_VISION_MODELS).length ? modelList(source.SYNTHIA_VISION_MODELS) : ["agnes:agnes-2.0-flash"];

  return {
    availableModels,
    visionModels,
    imageProvider: source.SYNTHIA_IMAGE_PROVIDER ?? "pixazo",
    imageModels: modelList(source.SYNTHIA_IMAGE_MODELS).length ? modelList(source.SYNTHIA_IMAGE_MODELS) : pixazoImageModels,
    videoProvider: source.SYNTHIA_VIDEO_PROVIDER ?? "pixazo",
    videoModels: modelList(source.SYNTHIA_VIDEO_MODELS).length ? modelList(source.SYNTHIA_VIDEO_MODELS) : pixazoVideoModels,
    audioProvider: source.SYNTHIA_AUDIO_PROVIDER ?? "pixazo",
    audioModels: modelList(source.SYNTHIA_AUDIO_MODELS).length ? modelList(source.SYNTHIA_AUDIO_MODELS) : pixazoAudioModels,
    pixazoImageModels,
    pixazoVideoModels,
    pixazoAudioModels,
    pixazoGenerationEnabled: source.SYNTHIA_PIXAZO_GENERATION_ENABLED ?? "true",
  };
}

const providerDefaults = configuredProviderDefaults();

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  postgresUrl: process.env.SYNTHIA_POSTGRES_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  publicAppUrl: process.env.SYNTHIA_PUBLIC_APP_URL ?? "",
  workerMode: process.env.SYNTHIA_WORKER_MODE ?? "embedded",
  logLevel: process.env.SYNTHIA_LOG_LEVEL ?? "info",
  encryptionKey: process.env.SYNTHIA_ENCRYPTION_KEY ?? "",
  networkLabManifestPrivateKey: process.env.SYNTHIA_NETWORK_LAB_MANIFEST_PRIVATE_KEY ?? "",
  eventRetentionDays: boundedPositiveInteger(process.env.SYNTHIA_EVENT_RETENTION_DAYS, 30, { min: 1, max: 3_650 }),
  sandboxRetentionDays: boundedPositiveInteger(process.env.SYNTHIA_SANDBOX_RETENTION_DAYS, 30, { min: 1, max: 3_650 }),
  maxAgentIterations: boundedPositiveInteger(process.env.SYNTHIA_MAX_AGENT_ITERATIONS, 80, { min: 1, max: 500 }),
  taskTimeoutSeconds: boundedPositiveInteger(process.env.SYNTHIA_TASK_TIMEOUT_SECONDS, 7_200, { min: 60, max: 86_400 }),
  redisUrl: process.env.REDIS_URL ?? "",
  redisTlsEnabled: process.env.REDIS_TLS_ENABLED === "true",
  sandboxProvider: process.env.SYNTHIA_SANDBOX_PROVIDER ?? "auto",
  e2bApiKey: process.env.E2B_API_KEY ?? "",
  e2bTemplateId: process.env.E2B_TEMPLATE_ID ?? "",
  e2bSandboxTimeoutSeconds: boundedPositiveInteger(process.env.E2B_SANDBOX_TIMEOUT_SECONDS, 82_800, { min: 60, max: 82_800 }),
  hopxApiKey: process.env.HOPX_API_KEY ?? "",
  hopxTemplateId: process.env.HOPX_TEMPLATE_ID ?? "",
  hopxBaseUrl: safeProviderBaseUrl(process.env.HOPX_BASE_URL, "https://api.hopx.dev"),
  hopxSandboxTimeoutSeconds: boundedPositiveInteger(process.env.HOPX_SANDBOX_TIMEOUT_SECONDS, 82_800, { min: 60, max: 82_800 }),
  dockerSandboxImage: process.env.SYNTHIA_DOCKER_SANDBOX_IMAGE ?? "synthia-sandbox:latest",
  sandboxAllowedHosts: publicHostnameAllowlist(process.env.SYNTHIA_SANDBOX_ALLOWED_HOSTS),
  sandboxPublicWebAccess: isExplicitlyEnabled(process.env.SYNTHIA_SANDBOX_PUBLIC_WEB_ACCESS),
  sandboxRegion: process.env.SYNTHIA_SANDBOX_REGION ?? "us",
  orchestratorProvider: process.env.SYNTHIA_ORCHESTRATOR_PROVIDER ?? "aihubmix",
  orchestratorModel: process.env.SYNTHIA_ORCHESTRATOR_MODEL ?? "glm-5.2-free",
  subtaskProvider: process.env.SYNTHIA_SUBTASK_PROVIDER ?? "",
  subtaskModel: process.env.SYNTHIA_SUBTASK_MODEL ?? "",
  availableModels: providerDefaults.availableModels,
  visionModels: providerDefaults.visionModels,
  imageProvider: providerDefaults.imageProvider,
  imageModels: providerDefaults.imageModels,
  videoProvider: providerDefaults.videoProvider,
  videoModels: providerDefaults.videoModels,
  videoApiKey: process.env.SYNTHIA_VIDEO_API_KEY ?? "",
  audioProvider: providerDefaults.audioProvider,
  audioModels: providerDefaults.audioModels,
  pixazoApiKey: process.env.PIXAZO_API_KEY ?? "",
  pixazoBaseUrl: safeProviderBaseUrl(process.env.PIXAZO_BASE_URL, "https://gateway.pixazo.ai"),
  pixazoImageModels: providerDefaults.pixazoImageModels,
  pixazoVideoModels: providerDefaults.pixazoVideoModels,
  pixazoAudioModels: providerDefaults.pixazoAudioModels,
  pixazoGenerationEnabled: providerDefaults.pixazoGenerationEnabled === "true",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  agnesApiKey: process.env.AGNES_API_KEY ?? "",
  agnesBaseUrl: safeProviderBaseUrl(process.env.AGNES_BASE_URL, "https://apihub.agnes-ai.com/v1"),
  aihubmixApiKey: process.env.AIHUBMIX_API_KEY ?? "",
  aihubmixBaseUrl: safeProviderBaseUrl(process.env.AIHUBMIX_BASE_URL, "https://aihubmix.com/v1"),
  aihubmixFallbackBaseUrl: safeProviderBaseUrl(process.env.AIHUBMIX_FALLBACK_BASE_URL, "https://api.inferera.com/v1"),
  aihubmixImageModels: modelList(process.env.AIHUBMIX_IMAGE_MODELS),
  aihubmixVideoModels: modelList(process.env.AIHUBMIX_VIDEO_MODELS),
  aihubmixAudioModels: modelList(process.env.AIHUBMIX_AUDIO_MODELS),
  aihubmixAudioVoice: process.env.AIHUBMIX_AUDIO_VOICE ?? "alloy",
  aihubmixArtifactAllowedHosts: publicHostnameAllowlist(process.env.AIHUBMIX_ARTIFACT_ALLOWED_HOSTS),
  aihubmixGenerationEnabled: process.env.SYNTHIA_AIHUBMIX_GENERATION_ENABLED === "true",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterHttpReferer: process.env.OPENROUTER_HTTP_REFERER ?? "",
  openRouterAppName: process.env.OPENROUTER_APP_NAME ?? "Synthia AI",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  agentBrowserProvider: process.env.SYNTHIA_AGENT_BROWSER_PROVIDER ?? "hyperbrowser",
  hyperbrowserApiKey: process.env.HYPERBROWSER_API_KEY ?? "",
  hyperbrowserBaseUrl: safeProviderBaseUrl(process.env.HYPERBROWSER_BASE_URL, "https://api.hyperbrowser.ai"),
  hyperbrowserTimeoutMinutes: boundedPositiveInteger(process.env.SYNTHIA_HYPERBROWSER_TIMEOUT_MINUTES, 10, { min: 5, max: 30 }),
  hyperbrowserAllowedHosts: publicHostnameAllowlist(process.env.SYNTHIA_HYPERBROWSER_ALLOWED_HOSTS),
  hyperbrowserPublicWebAccess: isExplicitlyEnabled(process.env.SYNTHIA_HYPERBROWSER_PUBLIC_WEB_ACCESS),
  supadataApiKey: process.env.SUPADATA_API_KEY ?? "",
  searchPrimary: process.env.SYNTHIA_SEARCH_PRIMARY ?? "tavily",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  serperApiKey: process.env.SERPER_API_KEY ?? "",
  storageProvider: process.env.SYNTHIA_STORAGE_PROVIDER ?? "r2",
  awsRegion: process.env.AWS_REGION ?? "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsS3Endpoint: process.env.AWS_S3_ENDPOINT ?? "",
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? "",
  emailPrimary: process.env.SYNTHIA_EMAIL_PRIMARY ?? "resend",
  emailFrom: process.env.SYNTHIA_EMAIL_FROM ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  postmarkServerToken: process.env.POSTMARK_SERVER_TOKEN ?? "",
  postmarkMessageStream: process.env.POSTMARK_MESSAGE_STREAM ?? "outbound",
  workosApiKey: process.env.WORKOS_API_KEY ?? "",
  workosClientId: process.env.WORKOS_CLIENT_ID ?? "",
  workosRedirectUri: process.env.WORKOS_REDIRECT_URI ?? "",
  workosCookiePassword: process.env.WORKOS_COOKIE_PASSWORD ?? "",
  workosAuthEnabled: process.env.SYNTHIA_WORKOS_AUTH_ENABLED === "true",
  realtimeVoiceEnabled: process.env.SYNTHIA_REALTIME_VOICE_ENABLED === "true",
  realtimeProvider: process.env.SYNTHIA_REALTIME_PROVIDER ?? "gemini_live",
  realtimeModel: process.env.SYNTHIA_REALTIME_MODEL ?? "gemini-2.5-flash-native-audio-preview-12-2025",
  realtimeDefaultVoice: process.env.SYNTHIA_REALTIME_DEFAULT_VOICE ?? "Aoede",
  realtimeVoiceWorkerReady: process.env.SYNTHIA_REALTIME_VOICE_WORKER_READY === "true",
  livekitUrl: process.env.LIVEKIT_URL ?? "",
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
  livekitAgentName: process.env.LIVEKIT_AGENT_NAME ?? "synthia-voice",
  zapierMcpEmbedId: process.env.ZAPIER_MCP_EMBED_ID ?? "",
  pipedreamClientId: process.env.PIPEDREAM_CLIENT_ID ?? "",
  pipedreamClientSecret: process.env.PIPEDREAM_CLIENT_SECRET ?? "",
  pipedreamProjectId: process.env.PIPEDREAM_PROJECT_ID ?? "",
  composioApiKey: process.env.COMPOSIO_API_KEY ?? "",
  composioAuthConfigId: process.env.COMPOSIO_AUTH_CONFIG_ID ?? "",
  composioBaseUrl: safeProviderBaseUrl(process.env.COMPOSIO_BASE_URL, "https://backend.composio.dev"),
};
