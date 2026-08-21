# Governed Connected Apps Research

**Research date:** 2026-08-21  
**Purpose:** Select a secure, user-authorized foundation for Synthia AI to work with external business applications without silently connecting accounts or executing consequential actions.

## Decision

Synthia should first expose a **provider-neutral connected-app catalog** and an auditable authorization boundary. A connection is only a user-initiated authorization request; it is not an action permission. Any future read, write, publication, payment, user-management, or deletion operation must be represented as a task-scoped proposal with a human-readable diff, affected account and scope, evidence, and explicit final approval.

> **Synthia’s product boundary:** external-app credentials remain with the selected connection provider or the original application. Synthia stores only connection metadata, consent state, allowed scopes, approval records, and audit references. It never treats a catalog entry as proof that an account is connected, and it never automatically runs a connected-app action.

## Options assessed

| Option | What the official documentation supports | Strength for Synthia | Constraint and decision |
| --- | --- | --- | --- |
| **Zapier MCP** | Account/workspace access controls, user-owned app connections, app and action restrictions, OAuth or API-key authentication, audit history, and account-level disablement.[1] | Broad application coverage and an existing disabled Zapier connector is already visible in the current workspace configuration. | The connection remains disabled until the owner explicitly authorizes it. Zapier’s per-tool task consumption, account-wide restriction model, and provider data-residency terms must be reviewed before activation. |
| **Pipedream Connect** | Managed authorization, per-user connected accounts, hosted OAuth/client support, a server-side proxy, and security guidance that credentials must never be exposed in client code.[2] | Strong implementation fit if Synthia needs server-controlled, embedded connection flows and per-user mapping. | Requires user-provided configuration, server-side credentials, and a controlled threat-model review before any production connection flow is built. |
| **Composio** | Stable per-user IDs, hosted Connect Links, provider-managed credentials and refresh, multiple connected accounts, configurable scopes, and connection lifecycle handling.[3] | Well aligned with agent-oriented identity isolation and short-lived user authorization journeys. | Use only after validating its data-processing posture, pricing, scopes, and incident/revocation flow for Synthia’s deployment. |
| **Direct OAuth integrations** | Provider-specific OAuth apps and scopes managed directly by Synthia. | Maximum control for a small, high-value set such as Google Sheets or GitHub. | Higher operational burden: token storage, rotation, revocation, provider review, and per-app security maintenance. Reserve for user-approved first-party integrations after the generic governance layer is proven. |

## Required controls before activation

| Control | Required behavior |
| --- | --- |
| **Per-user identity isolation** | Every connection is bound to Synthia’s stable authenticated user ID. No connection metadata or action proposal may cross user boundaries. |
| **Explicit OAuth initiation** | Only a direct user click can open a hosted authorization journey. The agent cannot create an authorization link opportunistically or infer consent from a prompt. |
| **Scope minimization** | The user sees requested scopes before authorization. Synthia defaults to read-only where the provider supports it and separates write, publish, payment, access-control, and delete permissions. |
| **Proposal before execution** | The agent may prepare a change set but must not execute it. The review record shows target application, account, operation, fields/diff, expected effects, reversible steps, and relevant evidence. |
| **Server-side-only provider access** | Provider credentials, client secrets, and access tokens never enter browser bundles, task events, model prompts, or task artifacts. |
| **Audit and revocation** | Durable consent and action-decision events capture what was proposed and approved. Users can disconnect or revoke a connection, and Synthia should stop using it immediately. |
| **Allowlist and rate boundaries** | Integrations, actions, domains, and task budgets must be allowlisted. Bulk or destructive operations require tighter limits and individual approval. |

## First delivery boundary

The first product increment is deliberately **non-executing**. It contains a catalog of prospective connection providers, transparent readiness states, and consent-first “connect when configured” controls. It does not request OAuth, call a provider, execute an app action, or store a third-party credential. This lets the user understand which integration route is appropriate before Synthia’s external-action authority expands.

## Provider-specific activation contracts

| Provider | User-facing authorization method | Synthia server requirement | Action boundary |
| --- | --- | --- | --- |
| **Zapier MCP Embed** | The provider-managed embed produces a user-specific MCP server URL after the user completes connection. | Store that URL only against its owner and keep the embed secret server-side; restrict the embed to Synthia’s configured domain. | Synthia can inspect available tools only after connection. Every consequential tool call remains a task proposal requiring approval. |
| **Pipedream Connect** | A user is redirected through Connect Link or opens the provider SDK using a short-lived, single-use Connect token. | Generate the user-scoped token only on the server from Pipedream OAuth credentials; never expose those credentials to the browser. | A connected account is not an execution grant. Tool or workflow requests remain owner-scoped and approval-gated. |
| **Composio Connect Link** | The provider-hosted link completes a user-scoped authentication flow against a configured Auth Config. | Create the link on the server with Synthia’s service credential, owner identifier, Auth Config ID, and a validated callback URL. | Keep token refresh and credential injection at the provider/server boundary; Synthia must not return credential material to the client. |

Zapier documents that its embed configuration uses allowed domains and a rotatable embed secret, then emits a user-specific server URL for the host application to store against that user. [4] Pipedream documents server-created short-lived tokens, a user-facing SDK or hosted Connect Link, and server-side handling of OAuth credentials. [5] Composio documents Auth Config scope selection and a hosted Connect Link, while its connected-account API masks sensitive credential fields by default. [6] [7]

Pipedream’s official TypeScript SDK accepts server-side OAuth client credentials and creates a Connect token with an `externalUserId`, allowed origins, redirect locations, optional webhook, a maximum four-hour expiry, and narrowly selected scopes. The browser must obtain that token only through a backend callback. [8] [9]

Composio’s hosted link endpoint is `POST /api/v3.1/connected_accounts/link`. Its server-only request needs an API key plus `auth_config_id` and stable `user_id`; it may include a validated callback URL. Its response carries `redirect_url`, `connected_account_id`, and expiry metadata, which must be handled as connection-session metadata rather than exposed credential material. [10]

> Synthia will present connection availability and user authorization only. It will not display internal LLM, media, sandbox, browser, database, storage, queue, or service-provider configuration in the user-facing Connectors area.

## References

[1]: https://docs.zapier.com/mcp/manage/security "Zapier MCP security: SOC 2 access controls & compliance"
[2]: https://pipedream.com/docs/connect "Pipedream Connect overview"
[3]: https://docs.composio.dev/docs/authentication "Composio authentication"
[4]: https://docs.zapier.com/mcp/embed/getting-started "Get started with Zapier MCP Embed"
[5]: https://pipedream.com/docs/connect/managed-auth/quickstart "Pipedream Connect managed auth quickstart"
[6]: https://docs.composio.dev/docs/tools-direct/authenticating-tools "Composio authenticating tools"
[7]: https://docs.composio.dev/docs/auth-configuration/connected-accounts "Composio connected accounts"
[8]: https://pipedream.com/docs/connect/api-reference/sdks "Pipedream Connect SDKs"
[9]: https://pipedream.com/docs/connect/api-reference/create-connect-token "Create Pipedream Connect token"
[10]: https://docs.composio.dev/reference/api-reference/connected-accounts/postConnectedAccountsLink "Create Composio auth link session"
