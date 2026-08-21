export type GovernedConnectedApp = {
  id: "zapier" | "pipedream" | "composio" | "github";
  label: string;
  integrationModel: string;
  description: string;
  connectionBoundary: string;
  serviceId?: "github";
};

export const GOVERNED_CONNECTED_APPS: GovernedConnectedApp[] = [
  {
    id: "zapier",
    label: "Zapier MCP",
    integrationModel: "Managed MCP and OAuth connections",
    description: "A broad connected-app route for approved tools across a user-managed Zapier account.",
    connectionBoundary: "Requires a user-authorized Zapier connection. Synthia must still show an action proposal before any tool call.",
  },
  {
    id: "pipedream",
    label: "Pipedream Connect",
    integrationModel: "Managed per-user authorization",
    description: "A server-controlled route for embedded OAuth connections and connected-app requests.",
    connectionBoundary: "Requires server-only provider configuration and a user-authorized connection before Synthia can propose an app action.",
  },
  {
    id: "composio",
    label: "Composio",
    integrationModel: "Agent-oriented per-user connected accounts",
    description: "A managed connection option with user-scoped account identities and refresh handling.",
    connectionBoundary: "Requires provider review, approved scopes, and an explicit user connection; agent prompts never constitute authorization.",
  },
  {
    id: "github",
    label: "GitHub",
    integrationModel: "Direct OAuth integration",
    description: "A focused first-party integration path for repository work after Synthia’s OAuth application is configured.",
    connectionBoundary: "Requires user OAuth approval. Repository changes, pull requests, and pushes remain task proposals pending explicit approval.",
    serviceId: "github",
  },
];

export function governedAppReadiness(configured: boolean | undefined) {
  return configured ? "Ready for user authorization" : "Configuration required";
}
