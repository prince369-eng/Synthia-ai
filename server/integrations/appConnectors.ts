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

function connectionReturnUrl(origin: string, provider: "pipedream" | "composio", failed = false) {
  const url = new URL("/plugins", origin);
  url.searchParams.set("connector", provider);
  if (failed) url.searchParams.set("authorization", "cancelled");
  return url.toString();
}

export async function startAppConnectorAuthorization(input: { provider: AppConnectorProvider; userId: number; requestOrigin: string }) {
  requireConfigured(input.provider);
  const origin = originForConnection(input.requestOrigin);

  if (input.provider === "zapier") {
    return { provider: input.provider, mode: "embedded" as const, embedId: ENV.zapierMcpEmbedId };
  }

  if (input.provider === "pipedream") {
    try {
      const session = await pipedreamClient().tokens.create({
        externalUserId: `synthia:${input.userId}`,
        allowedOrigins: [origin],
        successRedirectUri: connectionReturnUrl(origin, "pipedream"),
        errorRedirectUri: connectionReturnUrl(origin, "pipedream", true),
        expiresIn: 900,
        scope: "connect:accounts:read connect:accounts:write",
      });
      return { provider: input.provider, mode: "redirect" as const, authorizationUrl: session.connectLinkUrl, expiresAt: session.expiresAt.getTime() };
    } catch (error) {
      console.error(JSON.stringify({ event: "app_connector_start_failed", provider: input.provider, userId: input.userId, message: error instanceof Error ? error.message : "unknown" }));
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Pipedream could not start the authorization session. Please try again later." });
    }
  }

  try {
    const response = await fetch(`${ENV.composioBaseUrl.replace(/\/$/, "")}/api/v3.1/connected_accounts/link`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ENV.composioApiKey },
      body: JSON.stringify({
        auth_config_id: ENV.composioAuthConfigId,
        user_id: `synthia:${input.userId}`,
        callback_url: connectionReturnUrl(origin, "composio"),
      }),
    });
    const payload = await response.json() as { redirect_url?: unknown };
    if (!response.ok || typeof payload.redirect_url !== "string" || !payload.redirect_url.startsWith("https://")) {
      throw new Error(`Composio authorization link failed with ${response.status}`);
    }
    return { provider: input.provider, mode: "redirect" as const, authorizationUrl: payload.redirect_url };
  } catch (error) {
    console.error(JSON.stringify({ event: "app_connector_start_failed", provider: input.provider, userId: input.userId, message: error instanceof Error ? error.message : "unknown" }));
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Composio could not start the authorization session. Please try again later." });
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

export async function verifyPipedreamAuthorization(input: { userId: number }) {
  requireConfigured("pipedream");
  try {
    const accounts = await pipedreamClient().accounts.listByExternalUser(`synthia:${input.userId}`);
    if (!accounts.length) throw new TRPCError({ code: "NOT_FOUND", message: "No Pipedream account was authorized for this workspace yet." });
    const id = await createIntegrationForUser({
      userId: input.userId,
      provider: "pipedream_connect",
      label: "Pipedream Connect",
      encryptedAccessToken: encryptSecret(`pipedream-user:synthia:${input.userId}`),
      scopes: ["connect:accounts:read", "connect:accounts:write"],
      availableToAllTasks: false,
    });
    return { id, accountCount: accounts.length };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error(JSON.stringify({ event: "app_connector_verify_failed", provider: "pipedream", userId: input.userId, message: error instanceof Error ? error.message : "unknown" }));
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Pipedream connection verification is temporarily unavailable." });
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
