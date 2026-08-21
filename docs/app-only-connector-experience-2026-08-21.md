# App-Only Connector Experience

## Product Boundary

Synthia’s **Plugins** and **Integrations** surfaces now present only apps a workspace owner may authorize. They never list Synthia’s internal model routing, media services, browser infrastructure, storage, databases, sandboxes, or provider configuration. Credential values and third-party app credentials remain server-side or with the selected app provider.

| Surface | What it shows | What it must not show |
|---|---|---|
| Plugins | Available app connections, connection state, search, and approval boundaries | Internal service readiness, API-key state, model vendors, or infrastructure topology |
| Connector card | Provider-hosted authorization route, owner-scoped state, and the action-approval boundary | OAuth tokens, provider secrets, or a claim that an account is connected before verification |
| Integrations settings | Authorized app references and disconnect control | Backend configuration, credential values, internal provider health, or hidden capabilities |

## Available Connection Routes

The discovery view renders configured Pipedream Connect and Composio routes as **Ready to authorize**. The owner starts authorization by selecting **Connect**. Pipedream generates a short-lived, owner-scoped session on the server; Composio returns a provider-hosted connection link. Neither route runs automatically during page load, task creation, or task execution.

Zapier remains unavailable because its embed configuration has not been supplied. The interface does not expose a disabled configuration card as an app connection and makes no provider call on its behalf.

## Connection and Action Are Different

> A connection lets a future task propose use of an app. It does **not** authorize a consequential app action.

Every consequential app action remains a task proposal requiring the owner’s explicit approval. Synthia stores an owner-scoped connection reference only after provider-side authorization is verified. The app credential itself is never returned to the browser or stored in Synthia’s integration metadata. Disconnecting removes Synthia’s owner-scoped reference; users can revoke access with the connected provider as appropriate.

## Verification and UI Safeguards

The interface contains a single search field, All/Available/Connected views, compact app cards, and a management drawer for connected references. It displays empty states instead of sample connections. Automated regression coverage asserts that the interface remains app-only, that connection routes remain approval-gated, and that internal service-readiness data is not introduced into Plugins or Integrations settings.
