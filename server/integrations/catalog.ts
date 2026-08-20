import { ENV } from "../_core/env";

export type ServiceReadiness = {
  id: string;
  label: string;
  category: "model" | "search" | "queue" | "storage" | "notification" | "sandbox" | "integration";
  configured: boolean;
  active: boolean;
  requiredEnvironment: string[];
  status: "active" | "configured" | "credentials_required" | "connected" | "ready_to_connect" | "missing_credentials";
  detail?: string;
};

export type UserServiceConnection = { provider: string; expiresAt?: Date | null };

export function serviceConnectionStatus(configured: boolean, active: boolean): ServiceReadiness["status"] {
  if (active && configured) return "active";
  return configured ? "configured" : "credentials_required";
}

function service(
  id: string,
  label: string,
  category: ServiceReadiness["category"],
  configured: boolean,
  active: boolean,
  requiredEnvironment: string[],
  detail?: string,
): ServiceReadiness {
  return { id, label, category, configured, active, requiredEnvironment, status: serviceConnectionStatus(configured, active), detail };
}

export function systemServiceReadiness(): ServiceReadiness[] {
  return [
    service("groq", "Groq", "model", Boolean(ENV.groqApiKey), ENV.orchestratorProvider === "groq" || ENV.subtaskProvider === "groq", ["GROQ_API_KEY"]),
    service("agnes", "Agnes AI", "model", Boolean(ENV.agnesApiKey), ENV.orchestratorProvider === "agnes" || ENV.subtaskProvider === "agnes", ["AGNES_API_KEY", "AGNES_BASE_URL"]),
    service("aihubmix", "AIHubMix", "model", Boolean(ENV.aihubmixApiKey), ENV.orchestratorProvider === "aihubmix" || ENV.subtaskProvider === "aihubmix", ["AIHUBMIX_API_KEY", "AIHUBMIX_BASE_URL", "AIHUBMIX_FALLBACK_BASE_URL"]),
    service("openrouter", "OpenRouter", "model", Boolean(ENV.openRouterApiKey), ENV.orchestratorProvider === "openrouter" || ENV.subtaskProvider === "openrouter", ["OPENROUTER_API_KEY"]),
    service("gemini", "Gemini", "model", Boolean(ENV.geminiApiKey), ENV.orchestratorProvider === "gemini" || ENV.subtaskProvider === "gemini", ["GEMINI_API_KEY"]),
    service("deepseek", "DeepSeek", "model", Boolean(ENV.deepseekApiKey), ENV.orchestratorProvider === "deepseek" || ENV.subtaskProvider === "deepseek", ["DEEPSEEK_API_KEY"]),
    service("tavily", "Tavily", "search", Boolean(ENV.tavilyApiKey), ENV.searchPrimary === "tavily", ["TAVILY_API_KEY"]),
    service("serper", "Serper", "search", Boolean(ENV.serperApiKey), ENV.searchPrimary === "serper", ["SERPER_API_KEY"]),
    service("redis", "Redis", "queue", Boolean(ENV.redisUrl), Boolean(ENV.redisUrl), ["REDIS_URL"]),
    service("e2b", "E2B", "sandbox", Boolean(ENV.e2bApiKey), ENV.sandboxProvider === "e2b" || (ENV.sandboxProvider === "auto" && Boolean(ENV.e2bApiKey)), ["E2B_API_KEY", "E2B_TEMPLATE_ID"]),
    service("hopx", "Bunnyshell HopX", "sandbox", Boolean(ENV.hopxApiKey && ENV.hopxTemplateId), ENV.sandboxProvider === "hopx" || (ENV.sandboxProvider === "auto" && !ENV.e2bApiKey && Boolean(ENV.hopxApiKey && ENV.hopxTemplateId)), ["HOPX_API_KEY", "HOPX_TEMPLATE_ID"]),
    service("hyperbrowser", "Hyperbrowser Agent Browser", "sandbox", Boolean(ENV.hyperbrowserApiKey), ENV.agentBrowserProvider === "hyperbrowser" && ENV.hyperbrowserAllowedHosts.length > 0, ["HYPERBROWSER_API_KEY", "SYNTHIA_AGENT_BROWSER_PROVIDER", "SYNTHIA_HYPERBROWSER_TIMEOUT_MINUTES", "SYNTHIA_HYPERBROWSER_ALLOWED_HOSTS"], ENV.hyperbrowserApiKey && ENV.hyperbrowserAllowedHosts.length === 0 ? "Credential stored. Add an explicit allowed-domain policy before Synthia can create a remote browser session." : undefined),
    service("pixazo", "Pixazo", "model", Boolean(ENV.pixazoApiKey), Boolean(ENV.pixazoApiKey && ENV.pixazoGenerationEnabled && (ENV.pixazoImageModels.length > 0 || ENV.pixazoVideoModels.length > 0 || ENV.pixazoAudioModels.length > 0)), ["PIXAZO_API_KEY", "PIXAZO_IMAGE_MODELS", "PIXAZO_VIDEO_MODELS", "PIXAZO_AUDIO_MODELS", "SYNTHIA_PIXAZO_GENERATION_ENABLED"], ENV.pixazoApiKey && !ENV.pixazoGenerationEnabled ? "Credential stored. Add a model allowlist and explicitly enable media generation before image, video, or audio requests can run." : undefined),
    service("cloudflare-r2", "Cloudflare R2", "storage", Boolean(ENV.r2AccountId && ENV.r2AccessKeyId && ENV.r2SecretAccessKey && ENV.r2Bucket), ENV.storageProvider === "r2", ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]),
    service("amazon-s3", "Amazon S3", "storage", Boolean(ENV.awsRegion && ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsS3Bucket), ENV.storageProvider === "s3", ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"]),
    service("resend", "Resend", "notification", Boolean(ENV.resendApiKey && ENV.emailFrom), ENV.emailPrimary === "resend", ["RESEND_API_KEY", "SYNTHIA_EMAIL_FROM"]),
    service("postmark", "Postmark", "notification", Boolean(ENV.postmarkServerToken && ENV.emailFrom), ENV.emailPrimary === "postmark", ["POSTMARK_SERVER_TOKEN", "SYNTHIA_EMAIL_FROM"]),
    service("github", "GitHub", "integration", Boolean(process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET), false, ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"]),
    service("google", "Google", "integration", Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET), false, ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"]),
    service("notion", "Notion", "integration", Boolean(process.env.NOTION_OAUTH_CLIENT_ID && process.env.NOTION_OAUTH_CLIENT_SECRET), false, ["NOTION_OAUTH_CLIENT_ID", "NOTION_OAUTH_CLIENT_SECRET"]),
    service("slack", "Slack", "integration", Boolean(process.env.SLACK_OAUTH_CLIENT_ID && process.env.SLACK_OAUTH_CLIENT_SECRET), false, ["SLACK_OAUTH_CLIENT_ID", "SLACK_OAUTH_CLIENT_SECRET"]),
  ];
}

export function serviceReadinessForUser(connections: UserServiceConnection[], now = new Date()): ServiceReadiness[] {
  return systemServiceReadiness().map(service => {
    if (service.category !== "integration") return service;
    const connected = connections.some(connection => connection.provider.toLowerCase() === service.id && (!connection.expiresAt || connection.expiresAt > now));
    const status = connected ? "connected" : service.configured ? "ready_to_connect" : "missing_credentials";
    return { ...service, active: connected, status };
  });
}
