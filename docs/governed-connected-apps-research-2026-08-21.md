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

## References

[1]: https://docs.zapier.com/mcp/manage/security "Zapier MCP security: SOC 2 access controls & compliance"
[2]: https://pipedream.com/docs/connect "Pipedream Connect overview"
[3]: https://docs.composio.dev/docs/authentication "Composio authentication"
