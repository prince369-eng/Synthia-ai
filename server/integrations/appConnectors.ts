import { PipedreamClient } from "@pipedream/sdk";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { createIntegrationForUser } from "../db";
import { encryptSecret } from "../security/encryption";

export const appConnectorProviders = ["zapier", "pipedream", "composio"] as const;
export type AppConnectorProvider = typeof appConnectorProviders[number];

type AppConnectorReadiness = {
  provider: AppConnectorProvider;
  label: string;
  configured: boolean;
  authorization: "embedded" | "redirect";
  description: string;
  boundary: string;
};

export type UserFacingApp = {
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
  categories: string[];
  scopeOptions: string[];
  authorizationRequired: true;
  approvalRequired: true;
};

const USER_FACING_APP_CATALOG: UserFacingApp[] = [
  { slug: "gmail", name: "Gmail", description: "Prepare and organize email work in reviewable task proposals.", iconUrl: "", categories: ["Communication", "Productivity"], scopeOptions: ["Email", "Drafts"], authorizationRequired: true, approvalRequired: true },
  { slug: "google_drive", name: "Google Drive", description: "Find, organize, and prepare files for approved delivery work.", iconUrl: "", categories: ["Productivity", "Files"], scopeOptions: ["Files", "Folders"], authorizationRequired: true, approvalRequired: true },
  { slug: "google_calendar", name: "Google Calendar", description: "Plan calendar work with proposals shown before any event changes.", iconUrl: "", categories: ["Productivity", "Scheduling"], scopeOptions: ["Events", "Availability"], authorizationRequired: true, approvalRequired: true },
  { slug: "google_sheets", name: "Google Sheets", description: "Prepare spreadsheet updates for explicit review and approval.", iconUrl: "", categories: ["Productivity", "Data"], scopeOptions: ["Spreadsheets", "Worksheets"], authorizationRequired: true, approvalRequired: true },
  { slug: "notion", name: "Notion", description: "Organize pages and databases through reviewable task proposals.", iconUrl: "", categories: ["Knowledge", "Productivity"], scopeOptions: ["Pages", "Databases"], authorizationRequired: true, approvalRequired: true },
  { slug: "slack", name: "Slack", description: "Draft and coordinate message work without automatic posting.", iconUrl: "", categories: ["Communication", "Collaboration"], scopeOptions: ["Messages", "Channels"], authorizationRequired: true, approvalRequired: true },
  { slug: "github", name: "GitHub", description: "Prepare repository and issue work for your approval.", iconUrl: "", categories: ["Developer tools", "Collaboration"], scopeOptions: ["Repositories", "Issues"], authorizationRequired: true, approvalRequired: true },
  { slug: "linear", name: "Linear", description: "Organize issue and project work as explicit task proposals.", iconUrl: "", categories: ["Developer tools", "Project management"], scopeOptions: ["Issues", "Projects"], authorizationRequired: true, approvalRequired: true },
  { slug: "jira", name: "Jira", description: "Prepare issue and project updates for a deliberate review step.", iconUrl: "", categories: ["Project management", "Developer tools"], scopeOptions: ["Issues", "Projects"], authorizationRequired: true, approvalRequired: true },
  { slug: "trello", name: "Trello", description: "Organize board and card work through approval-gated proposals.", iconUrl: "", categories: ["Project management", "Collaboration"], scopeOptions: ["Boards", "Cards"], authorizationRequired: true, approvalRequired: true },
  { slug: "airtable", name: "Airtable", description: "Prepare structured record work for your explicit authorization.", iconUrl: "", categories: ["Data", "Productivity"], scopeOptions: ["Bases", "Records"], authorizationRequired: true, approvalRequired: true },
  { slug: "dropbox", name: "Dropbox", description: "Organize file and folder work in reviewable task proposals.", iconUrl: "", categories: ["Files", "Productivity"], scopeOptions: ["Files", "Folders"], authorizationRequired: true, approvalRequired: true },
  { slug: "hubspot", name: "HubSpot", description: "Prepare CRM updates for approval before any customer record changes.", iconUrl: "", categories: ["CRM", "Sales"], scopeOptions: ["Contacts", "Deals"], authorizationRequired: true, approvalRequired: true },
  { slug: "salesforce", name: "Salesforce", description: "Prepare CRM work as a task proposal for your review.", iconUrl: "", categories: ["CRM", "Sales"], scopeOptions: ["Accounts", "Leads"], authorizationRequired: true, approvalRequired: true },
  { slug: "asana", name: "Asana", description: "Coordinate task and project work with approval before changes.", iconUrl: "", categories: ["Project management", "Collaboration"], scopeOptions: ["Tasks", "Projects"], authorizationRequired: true, approvalRequired: true },
];

export function appConnectorReadiness(): AppConnectorReadiness[] {
  return [
    {
      provider: "zapier",
      label: "Zapier MCP",
      configured: Boolean(ENV.zapierMcpEmbedId),
      authorization: "embedded",
      description: "Connect selected apps through Zapier’s user-authorized MCP Embed.",
      boundary: "Tool access is not action approval. Consequential work must remain a task-scoped proposal.",
    },
    {
      provider: "pipedream",
      label: "Pipedream Connect",
      configured: Boolean(ENV.pipedreamClientId && ENV.pipedreamClientSecret && ENV.pipedreamProjectId),
      authorization: "redirect",
      description: "Authorize connected accounts through a short-lived, user-scoped Pipedream Connect session.",
      boundary: "Credentials remain with Pipedream; Synthia records only the owner-scoped connection reference.",
    },
    {
      provider: "composio",
      label: "Composio",
      configured: Boolean(ENV.composioApiKey && ENV.composioAuthConfigId),
      authorization: "redirect",
      description: "Authorize an account through a provider-hosted Composio Connect Link.",
      boundary: "Synthia never receives the app credential, and future app actions require explicit approval.",
    },
  ];
}

function configured(provider: AppConnectorProvider) {
  return appConnectorReadiness().find(item => item.provider === provider)?.configured === true;
}

function originForConnection(requestOrigin: string) {
  const candidate = ENV.publicAppUrl || requestOrigin;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("protocol");
    return url.origin;
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A trusted public application URL is required before an app authorization session can start." });
  }
}

function requireConfigured(provider: AppConnectorProvider) {
  if (!configured(provider)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${appConnectorReadiness().find(item => item.provider === provider)?.label ?? provider} is not configured for this workspace yet.` });
  }
}

function pipedreamClient() {
  return new PipedreamClient({
    clientId: ENV.pipedreamClientId,
    clientSecret: ENV.pipedreamClientSecret,
    projectId: ENV.pipedreamProjectId,
  });
}

function connectionReturnUrl(origin: string, appSlug: string, failed = false) {
  const url = new URL("/plugins", origin);
  url.searchParams.set("app", appSlug);
  if (failed) url.searchParams.set("authorization", "cancelled");
  return url.toString();
}

function requireAppSlug(appSlug: string) {
  if (!/^[a-z0-9][a-z0-9_-]{1,127}$/i.test(appSlug)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That app selection is invalid." });
  }
}

export function listUserFacingApps(): UserFacingApp[] {
  return USER_FACING_APP_CATALOG.map(app => ({ ...app, categories: [...app.categories], scopeOptions: [...app.scopeOptions] }));
}

export async function startAppConnectorAuthorization(input: { appSlug: string; userId: number; requestOrigin: string }) {
  requireConfigured("pipedream");
  requireAppSlug(input.appSlug);
  const origin = originForConnection(input.requestOrigin);
  try {
    const session = await pipedreamClient().tokens.create({
      externalUserId: `synthia:${input.userId}`,
      allowedOrigins: [origin],
      successRedirectUri: connectionReturnUrl(origin, input.appSlug),
      errorRedirectUri: connectionReturnUrl(origin, input.appSlug, true),
      expiresIn: 900,
      scope: "connect:accounts:read connect:accounts:write",
    });
    const authorizationUrl = new URL(session.connectLinkUrl);
    authorizationUrl.searchParams.set("app", input.appSlug);
    return { mode: "redirect" as const, authorizationUrl: authorizationUrl.toString(), expiresAt: session.expiresAt.getTime() };
  } catch (error) {
    console.error(JSON.stringify({ event: "app_connector_start_failed", appSlug: input.appSlug, userId: input.userId, message: error instanceof Error ? error.message : "unknown" }));
    throw new TRPCError({ code: "BAD_GATEWAY", message: "This app could not start the authorization session. Please try again later." });
  }
}

export async function completeZapierMcpAuthorization(input: { userId: number; mcpServerUrl: string }) {
  requireConfigured("zapier");
  let url: URL;
  try {
    url = new URL(input.mcpServerUrl);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Zapier returned an invalid MCP server URL." });
  }
  if (url.protocol !== "https:" || url.hostname !== "mcp.zapier.com") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Zapier returned an untrusted MCP server URL." });
  }
  const id = await createIntegrationForUser({
    userId: input.userId,
    provider: "zapier_mcp",
    label: "Zapier MCP",
    encryptedAccessToken: encryptSecret(url.toString()),
    scopes: ["tools:read"],
    availableToAllTasks: false,
  });
  return { id };
}

export async function verifyPipedreamAuthorization(input: { userId: number; appSlug: string }) {
  requireConfigured("pipedream");
  requireAppSlug(input.appSlug);
  try {
    const accounts = await pipedreamClient().accounts.listByExternalUser(`synthia:${input.userId}`, { app: input.appSlug });
    const account = accounts.find(candidate => candidate.app?.nameSlug === input.appSlug) ?? accounts[0];
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "No account was authorized for this app yet." });
    const label = account.app?.name?.trim() || input.appSlug.replace(/[-_]+/g, " ").replace(/\b\w/g, character => character.toUpperCase());
    const id = await createIntegrationForUser({
      userId: input.userId,
      provider: "pipedream_connect",
      label,
      encryptedAccessToken: encryptSecret(`pipedream-account:${account.id}`),
      scopes: account.authorizedScopes ?? [],
      availableToAllTasks: false,
    });
    return { id, app: { slug: input.appSlug, name: label } };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error(JSON.stringify({ event: "app_connector_verify_failed", appSlug: input.appSlug, userId: input.userId, message: error instanceof Error ? error.message : "unknown" }));
    throw new TRPCError({ code: "BAD_GATEWAY", message: "This app connection could not be verified right now." });
  }
}

export async function verifyComposioAuthorization(input: { userId: number }) {
  requireConfigured("composio");
  try {
    const url = new URL(`${ENV.composioBaseUrl.replace(/\/$/, "")}/api/v3.1/connected_accounts`);
    url.searchParams.set("user_ids", `synthia:${input.userId}`);
    url.searchParams.set("auth_config_ids", ENV.composioAuthConfigId);
    url.searchParams.set("limit", "20");
    const response = await fetch(url, { headers: { "x-api-key": ENV.composioApiKey } });
    const payload = await response.json() as { items?: Array<{ id?: unknown; status?: unknown }> };
    const account = Array.isArray(payload.items) ? payload.items.find(item => typeof item.id === "string" && item.status === "ACTIVE") : undefined;
    if (!response.ok) throw new Error(`Composio connected-account lookup failed with ${response.status}`);
    if (!account || typeof account.id !== "string") throw new TRPCError({ code: "NOT_FOUND", message: "No active Composio account is authorized for this workspace yet." });
    const id = await createIntegrationForUser({
      userId: input.userId,
      provider: "composio",
      label: "Composio",
      encryptedAccessToken: encryptSecret(`composio-account:${account.id}`),
      scopes: [`auth-config:${ENV.composioAuthConfigId}`],
      availableToAllTasks: false,
    });
    return { id };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error(JSON.stringify({ event: "app_connector_verify_failed", provider: "composio", userId: input.userId, message: error instanceof Error ? error.message : "unknown" }));
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Composio connection verification is temporarily unavailable." });
  }
}
