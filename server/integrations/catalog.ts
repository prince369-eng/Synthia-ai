import { ENV } from "../_core/env";

export type ServiceReadiness = {
  id: string;
  label: string;
  category: "model" | "search" | "storage" | "notification" | "sandbox" | "integration";
  configured: boolean;
  active: boolean;
  requiredEnvironment: string[];
  status: "active" | "configured" | "credentials_required" | "connected" | "ready_to_connect" | "missing_credentials";
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
): ServiceReadiness {
  return { id, label, category, configured, active, requiredEnvironment, status: serviceConnectionStatus(configured, active) };
}

export function systemServiceReadiness(): ServiceReadiness[] {
  return [
    service("groq", "Groq", "model", Boolean(ENV.groqApiKey), ENV.orchestratorProvider === "groq" || ENV.subtaskProvider === "groq", ["GROQ_API_KEY"]),
    service("openrouter", "OpenRouter", "model", Boolean(ENV.openRouterApiKey), ENV.orchestratorProvider === "openrouter" || ENV.subtaskProvider === "openrouter", ["OPENROUTER_API_KEY"]),
    service("gemini", "Gemini", "model", Boolean(ENV.geminiApiKey), ENV.orchestratorProvider === "gemini" || ENV.subtaskProvider === "gemini", ["GEMINI_API_KEY"]),
    service("deepseek", "DeepSeek", "model", Boolean(ENV.deepseekApiKey), ENV.orchestratorProvider === "deepseek" || ENV.subtaskProvider === "deepseek", ["DEEPSEEK_API_KEY"]),
    service("tavily", "Tavily", "search", Boolean(ENV.tavilyApiKey), ENV.searchPrimary === "tavily", ["TAVILY_API_KEY"]),
    service("serper", "Serper", "search", Boolean(ENV.serperApiKey), ENV.searchPrimary === "serper", ["SERPER_API_KEY"]),
    service("e2b", "E2B", "sandbox", Boolean(ENV.e2bApiKey), ENV.sandboxProvider === "e2b" || (ENV.sandboxProvider === "auto" && Boolean(ENV.e2bApiKey)), ["E2B_API_KEY", "E2B_TEMPLATE_ID"]),
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
