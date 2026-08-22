import { PipedreamClient } from "@pipedream/sdk";
import { TRPCError } from "@trpc/server";
import { ENV, isPublicConfiguredHostname } from "../_core/env";
import { createIntegrationForUser } from "../db";
import { encryptSecret } from "../security/encryption";
import { logger } from "../security/logger";

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
  featured: boolean;
};

type CuratedAppSeed = readonly [slug: string, name: string, category: string, iconSlug?: string];

const CURATED_APP_SEEDS: CuratedAppSeed[] = [
  ["gmail", "Gmail", "Communication"], ["google_drive", "Google Drive", "Files", "googledrive"], ["google_calendar", "Google Calendar", "Scheduling", "googlecalendar"], ["google_sheets", "Google Sheets", "Data", "googlesheets"], ["google_docs", "Google Docs", "Productivity", "googledocs"], ["google_forms", "Google Forms", "Forms", "googleforms"], ["google_contacts", "Google Contacts", "CRM", "googlecontacts"], ["google_chat", "Google Chat", "Communication", "googlechat"],
  ["microsoft_outlook", "Microsoft Outlook", "Communication", "microsoftoutlook"], ["microsoft_onedrive", "Microsoft OneDrive", "Files", "microsoftonedrive"], ["microsoft_excel", "Microsoft Excel", "Data", "microsoftexcel"], ["microsoft_teams", "Microsoft Teams", "Communication", "microsoftteams"], ["microsoft_todo", "Microsoft To Do", "Productivity", "microsofttodo"], ["sharepoint", "Microsoft SharePoint", "Files", "microsoftsharepoint"], ["microsoft_azure", "Microsoft Azure", "Developer tools", "microsoftazure"],
  ["notion", "Notion", "Knowledge"], ["coda", "Coda", "Knowledge"], ["clickup", "ClickUp", "Project management"], ["monday", "monday.com", "Project management", "monday"], ["asana", "Asana", "Project management"], ["trello", "Trello", "Project management"], ["todoist", "Todoist", "Productivity"], ["wrike", "Wrike", "Project management"], ["smartsheet", "Smartsheet", "Project management"], ["basecamp", "Basecamp", "Project management"], ["teamwork", "Teamwork", "Project management"], ["height", "Height", "Project management"], ["motion", "Motion", "Productivity"], ["sunsama", "Sunsama", "Productivity"], ["any_do", "Any.do", "Productivity", "anydo"], ["ticktick", "TickTick", "Productivity"],
  ["slack", "Slack", "Communication"], ["discord", "Discord", "Communication"], ["zoom", "Zoom", "Communication"], ["webex", "Webex", "Communication"], ["telegram", "Telegram", "Communication"], ["whatsapp_business", "WhatsApp Business", "Communication", "whatsapp"], ["twilio", "Twilio", "Communication"], ["intercom", "Intercom", "Communication"], ["front", "Front", "Communication"], ["helpscout", "Help Scout", "Customer support", "helpscout"], ["zendesk", "Zendesk", "Customer support"], ["freshdesk", "Freshdesk", "Customer support"], ["crisp", "Crisp", "Customer support"], ["drift", "Drift", "Communication"], ["ringcentral", "RingCentral", "Communication"], ["dialpad", "Dialpad", "Communication"], ["loom", "Loom", "Communication"],
  ["github", "GitHub", "Developer tools"], ["gitlab", "GitLab", "Developer tools"], ["bitbucket", "Bitbucket", "Developer tools"], ["jira", "Jira", "Project management"], ["linear", "Linear", "Project management"], ["azure_devops", "Azure DevOps", "Developer tools", "azuredevops"], ["circleci", "CircleCI", "Developer tools"], ["jenkins", "Jenkins", "Developer tools"], ["sentry", "Sentry", "Developer tools"], ["datadog", "Datadog", "Developer tools"], ["new_relic", "New Relic", "Developer tools", "newrelic"], ["pagerduty", "PagerDuty", "Developer tools"], ["opsgenie", "Opsgenie", "Developer tools"], ["vercel", "Vercel", "Developer tools"], ["netlify", "Netlify", "Developer tools"], ["cloudflare", "Cloudflare", "Developer tools"], ["aws", "Amazon Web Services", "Developer tools", "amazonwebservices"], ["docker", "Docker", "Developer tools"], ["digitalocean", "DigitalOcean", "Developer tools"], ["postman", "Postman", "Developer tools"], ["supabase", "Supabase", "Developer tools"], ["firebase", "Firebase", "Developer tools"], ["railway", "Railway", "Developer tools"], ["render", "Render", "Developer tools"], ["snyk", "Snyk", "Developer tools"], ["sonarcloud", "SonarCloud", "Developer tools"], ["launchdarkly", "LaunchDarkly", "Developer tools"],
  ["airtable", "Airtable", "Data"], ["google_bigquery", "Google BigQuery", "Data", "googlebigquery"], ["snowflake", "Snowflake", "Data"], ["postgres", "PostgreSQL", "Data", "postgresql"], ["mysql", "MySQL", "Data"], ["microsoft_sql_server", "Microsoft SQL Server", "Data", "microsoftsqlserver"], ["mongodb", "MongoDB", "Data"], ["redis", "Redis", "Data"], ["elasticsearch", "Elasticsearch", "Data"], ["looker", "Looker", "Analytics"], ["tableau", "Tableau", "Analytics"], ["power_bi", "Microsoft Power BI", "Analytics", "powerbi"], ["google_analytics", "Google Analytics", "Analytics", "googleanalytics"], ["mixpanel", "Mixpanel", "Analytics"], ["amplitude", "Amplitude", "Analytics"], ["segment", "Segment", "Data"], ["fivetran", "Fivetran", "Data"], ["dbt_cloud", "dbt Cloud", "Data", "dbt"], ["metabase", "Metabase", "Analytics"], ["hex", "Hex", "Data"], ["retool", "Retool", "Developer tools"], ["rows", "Rows", "Data"],
  ["hubspot", "HubSpot", "CRM"], ["salesforce", "Salesforce", "CRM"], ["pipedrive", "Pipedrive", "CRM"], ["close", "Close", "CRM"], ["zoho_crm", "Zoho CRM", "CRM", "zoho"], ["freshsales", "Freshsales", "CRM"], ["copper", "Copper", "CRM"], ["insightly", "Insightly", "CRM"], ["keap", "Keap", "CRM"], ["activecampaign", "ActiveCampaign", "Marketing"], ["mailchimp", "Mailchimp", "Marketing"], ["klaviyo", "Klaviyo", "Marketing"], ["brevo", "Brevo", "Marketing"], ["campaign_monitor", "Campaign Monitor", "Marketing", "campaignmonitor"], ["convertkit", "Kit", "Marketing", "kit"], ["marketo", "Adobe Marketo Engage", "Marketing", "adobemarketo"], ["customer_io", "Customer.io", "Marketing", "customerio"], ["braze", "Braze", "Marketing"], ["sendgrid", "Twilio SendGrid", "Marketing", "sendgrid"], ["postmark", "Postmark", "Marketing"],
  ["shopify", "Shopify", "Commerce"], ["woocommerce", "WooCommerce", "Commerce"], ["stripe", "Stripe", "Commerce"], ["square", "Square", "Commerce"], ["paypal", "PayPal", "Commerce"], ["quickbooks", "QuickBooks", "Finance"], ["xero", "Xero", "Finance"], ["freshbooks", "FreshBooks", "Finance"], ["chargebee", "Chargebee", "Commerce"], ["paddle", "Paddle", "Commerce"], ["gumroad", "Gumroad", "Commerce"], ["shippo", "Shippo", "Commerce"], ["shipstation", "ShipStation", "Commerce"],
  ["linkedin", "LinkedIn", "Social"], ["x", "X", "Social"], ["facebook_pages", "Facebook Pages", "Social", "facebook"], ["instagram_business", "Instagram Business", "Social", "instagram"], ["youtube", "YouTube", "Social"], ["tiktok", "TikTok", "Social"], ["buffer", "Buffer", "Social"], ["hootsuite", "Hootsuite", "Social"], ["later", "Later", "Social"],
  ["typeform", "Typeform", "Forms"], ["jotform", "Jotform", "Forms"], ["tally", "Tally", "Forms"], ["surveymonkey", "SurveyMonkey", "Forms"], ["calendly", "Calendly", "Scheduling"], ["cal_com", "Cal.com", "Scheduling", "caldotcom"], ["eventbrite", "Eventbrite", "Scheduling"],
  ["dropbox", "Dropbox", "Files"], ["box", "Box", "Files"], ["egnyte", "Egnyte", "Files"], ["webflow", "Webflow", "Content"], ["wordpress", "WordPress", "Content"], ["framer", "Framer", "Content"], ["wix", "Wix", "Content"], ["contentful", "Contentful", "Content"], ["sanity", "Sanity", "Content"], ["ghost", "Ghost", "Content"],
];

function capabilityLabels(category: string) {
  const labels: Record<string, string[]> = {
    "Communication": ["Messages", "Drafts"], "Customer support": ["Tickets", "Replies"], "Files": ["Files", "Folders"], "Scheduling": ["Events", "Availability"], "Data": ["Records", "Data sets"], "Analytics": ["Reports", "Dashboards"], "Forms": ["Forms", "Responses"], "Knowledge": ["Pages", "Databases"], "Productivity": ["Tasks", "Documents"], "Project management": ["Projects", "Tasks"], "Developer tools": ["Projects", "Issues"], "CRM": ["Contacts", "Records"], "Marketing": ["Audiences", "Campaigns"], "Commerce": ["Orders", "Products"], "Finance": ["Invoices", "Transactions"], "Social": ["Posts", "Channels"], "Content": ["Content", "Publishing"],
  };
  return labels[category] ?? ["Records", "Updates"];
}

function descriptionForCategory(category: string) {
  const focus: Record<string, string> = {
    "Communication": "message work", "Customer support": "support work", "Files": "file work", "Scheduling": "scheduling work", "Data": "structured data work", "Analytics": "reporting work", "Forms": "form work", "Knowledge": "knowledge work", "Productivity": "productivity work", "Project management": "project work", "Developer tools": "development work", "CRM": "customer-record work", "Marketing": "marketing work", "Commerce": "commerce work", "Finance": "finance work", "Social": "social publishing work", "Content": "content work",
  };
  return `Prepare ${focus[category] ?? "app work"} as a reviewable task proposal.`;
}

const ICON_COLORS: Record<string, string> = {
  airtable: "18BFFF", asana: "F06A6A", atlassian: "1868DB", calendly: "006BFF", clickup: "7B68EE",
  discord: "5865F2", dropbox: "0061FF", facebook: "1877F2", figma: "F24E1E", github: "F0F6FC",
  gmail: "EA4335", googledrive: "4285F4", googlecalendar: "4285F4", googlesheets: "34A853", googledocs: "4285F4",
  hubspot: "FF7A59", instagram: "E4405F", jira: "2684FF", linear: "F4F4F5", linkedin: "0A66C2",
  mailchimp: "FFE01B", microsoftoutlook: "0078D4", microsoftteams: "6264A7", notion: "F4F4F5", openai: "F4F4F5",
  salesforce: "00A1E0", shopify: "7AB55C", slack: "4A154B", stripe: "635BFF", trello: "0C66E4",
  twilio: "F22F46", typeform: "F4F4F5", whatsapp: "25D366", wordpress: "21759B", youtube: "FF0000", zoom: "2D8CFF",
};

function simpleIconUrl(iconSlug: string) {
  const color = ICON_COLORS[iconSlug] ?? "A7F3D0";
  return `https://cdn.simpleicons.org/${encodeURIComponent(iconSlug)}/${color}?viewbox=auto`;
}

/**
 * Directory metadata comes from an integration provider but is rendered directly in
 * the owner's browser. Preserve legitimate public HTTPS icon URLs while falling
 * back to the local catalog icon for credentials, non-standard ports, and local
 * targets. This does not fetch or otherwise interact with the referenced URL.
 */
export function safeCatalogIconUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !isPublicConfiguredHostname(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""))
    ) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function toUserFacingApp(seed: CuratedAppSeed, index: number): UserFacingApp {
  const [slug, name, category, iconSlug = slug] = seed;
  return { slug, name, description: descriptionForCategory(category), iconUrl: simpleIconUrl(iconSlug), categories: [category], scopeOptions: capabilityLabels(category), authorizationRequired: true, approvalRequired: true, featured: index < 24 };
}

const USER_FACING_APP_CATALOG: UserFacingApp[] = CURATED_APP_SEEDS.map(toUserFacingApp);

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

export function trustedPipedreamAuthorizationUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The authorization service returned an invalid destination." });
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "connect.pipedream.com" ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The authorization service returned an untrusted destination." });
  }

  return url;
}

export function listUserFacingApps(): UserFacingApp[] {
  return USER_FACING_APP_CATALOG.map(app => ({ ...app, categories: [...app.categories], scopeOptions: [...app.scopeOptions] }));
}

export async function browseAdditionalUserFacingApps(input: { query?: string; after?: string; limit: number }) {
  requireConfigured("pipedream");
  const query = input.query?.trim();
  try {
    const page = await pipedreamClient().apps.list({
      after: input.after,
      limit: input.limit,
      q: query || undefined,
      sortKey: "featured_weight",
      sortDirection: "desc",
      hasComponents: true,
    });
    const excluded = new Set(USER_FACING_APP_CATALOG.map(app => app.slug));
    const apps = page.data
      .filter(app => !excluded.has(app.nameSlug))
      .map(app => ({
        slug: app.nameSlug,
        name: app.name,
        description: app.description?.trim() || "Prepare work in this app as a reviewable task proposal.",
        iconUrl: safeCatalogIconUrl(app.imgSrc, simpleIconUrl(app.nameSlug)),
        categories: app.categories.length ? app.categories.slice(0, 2) : ["More apps"],
        scopeOptions: app.scopeProfiles.map(profile => profile.name).filter(Boolean).slice(0, 2).length
          ? app.scopeProfiles.map(profile => profile.name).filter(Boolean).slice(0, 2)
          : ["Permissions shown before connection"],
        authorizationRequired: true as const,
        approvalRequired: true as const,
        featured: false,
      }));
    return { apps, nextCursor: page.response.pageInfo.endCursor ?? null, totalCount: page.response.pageInfo.totalCount ?? null };
  } catch (error) {
    logger.error({ event: "app_directory_browse_failed", hasQuery: Boolean(query), errorKind: error instanceof Error ? error.name : "unknown" }, "Connected-app directory browsing failed");
    throw new TRPCError({ code: "BAD_GATEWAY", message: "More apps could not be loaded right now. Try again shortly." });
  }
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
    const authorizationUrl = trustedPipedreamAuthorizationUrl(session.connectLinkUrl);
    authorizationUrl.searchParams.set("app", input.appSlug);
    return { mode: "redirect" as const, authorizationUrl: authorizationUrl.toString(), expiresAt: session.expiresAt.getTime() };
  } catch (error) {
    logger.error({ event: "app_connector_start_failed", appSlug: input.appSlug, userId: input.userId, errorKind: error instanceof Error ? error.name : "unknown" }, "Connected-app authorization initialization failed");
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
    logger.error({ event: "app_connector_verify_failed", appSlug: input.appSlug, userId: input.userId, errorKind: error instanceof Error ? error.name : "unknown" }, "Connected-app authorization verification failed");
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
    logger.error({ event: "app_connector_verify_failed", provider: "composio", userId: input.userId, errorKind: error instanceof Error ? error.name : "unknown" }, "Connected-app authorization verification failed");
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Composio connection verification is temporarily unavailable." });
  }
}
