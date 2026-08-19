import { ENV } from "../_core/env";

export type ServiceReadiness = {
  id: string;
  label: string;
  category: "model" | "search" | "storage" | "notification" | "sandbox" | "integration";
  configured: boolean;
  active: boolean;
};

export function systemServiceReadiness(): ServiceReadiness[] {
  return [
    { id: "groq", label: "Groq", category: "model", configured: Boolean(ENV.groqApiKey), active: ENV.orchestratorProvider === "groq" || ENV.subtaskProvider === "groq" },
    { id: "openrouter", label: "OpenRouter", category: "model", configured: Boolean(ENV.openRouterApiKey), active: ENV.orchestratorProvider === "openrouter" || ENV.subtaskProvider === "openrouter" },
    { id: "gemini", label: "Gemini", category: "model", configured: Boolean(ENV.geminiApiKey), active: ENV.orchestratorProvider === "gemini" || ENV.subtaskProvider === "gemini" },
    { id: "deepseek", label: "DeepSeek", category: "model", configured: Boolean(ENV.deepseekApiKey), active: ENV.orchestratorProvider === "deepseek" || ENV.subtaskProvider === "deepseek" },
    { id: "tavily", label: "Tavily", category: "search", configured: Boolean(ENV.tavilyApiKey), active: ENV.searchPrimary === "tavily" },
    { id: "serper", label: "Serper", category: "search", configured: Boolean(ENV.serperApiKey), active: ENV.searchPrimary === "serper" },
    { id: "e2b", label: "E2B", category: "sandbox", configured: Boolean(ENV.e2bApiKey), active: ENV.sandboxProvider === "e2b" || (ENV.sandboxProvider === "auto" && Boolean(ENV.e2bApiKey)) },
    { id: "cloudflare-r2", label: "Cloudflare R2", category: "storage", configured: Boolean(ENV.r2AccountId && ENV.r2AccessKeyId && ENV.r2SecretAccessKey && ENV.r2Bucket), active: ENV.storageProvider === "r2" },
    { id: "amazon-s3", label: "Amazon S3", category: "storage", configured: Boolean(ENV.awsRegion && ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsS3Bucket), active: ENV.storageProvider === "s3" },
    { id: "resend", label: "Resend", category: "notification", configured: Boolean(ENV.resendApiKey && ENV.emailFrom), active: ENV.emailPrimary === "resend" },
    { id: "postmark", label: "Postmark", category: "notification", configured: Boolean(ENV.postmarkServerToken && ENV.emailFrom), active: ENV.emailPrimary === "postmark" },
    { id: "github", label: "GitHub", category: "integration", configured: Boolean(process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET), active: false },
    { id: "google", label: "Google", category: "integration", configured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET), active: false },
    { id: "notion", label: "Notion", category: "integration", configured: Boolean(process.env.NOTION_OAUTH_CLIENT_ID && process.env.NOTION_OAUTH_CLIENT_SECRET), active: false },
    { id: "slack", label: "Slack", category: "integration", configured: Boolean(process.env.SLACK_OAUTH_CLIENT_ID && process.env.SLACK_OAUTH_CLIENT_SECRET), active: false },
  ];
}
