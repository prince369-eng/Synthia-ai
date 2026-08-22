# Connector Authorization Redirect Hardening

**Date:** 2026-08-22  
**Scope:** Browser navigation to provider-hosted connected-app authorization sessions.

## Finding

The connected-app flow receives a provider-hosted authorization URL after an owner explicitly chooses to connect an app. The server previously parsed the returned URL but did not constrain its origin before passing it to the browser. The client then navigated directly to the returned string.

Even though this URL is expected from the configured authorization provider rather than direct user input, it is a security-sensitive redirect boundary. A malformed, compromised, or unexpected response must not be able to redirect an authenticated browser to an arbitrary destination.

## Implemented Boundary

Both the server and client now independently accept an authorization destination only when it is a canonical `https://connect.pipedream.com` URL with no explicit port and no embedded username or password. The server validates the provider return before serializing it through the protected tRPC response. The client repeats the validation immediately before invoking browser navigation.

| Validation | Accepted | Rejected |
|---|---|---|
| Protocol | HTTPS only. | HTTP, JavaScript URLs, or every other scheme. |
| Host | Exact canonical authorization host. | Base domain, lookalikes, arbitrary subdomains, or attacker-owned hosts. |
| Port | Default HTTPS port only. | Explicit non-default ports. |
| Userinfo | No embedded username or password. | Any URL with credential-like userinfo. |

The change applies only after a user explicitly selects an app connection. It does not start a connection on page load, authorize an app, request scopes, invoke a provider action, or weaken the existing owner-scoped, approval-first task boundary.

## Regression Coverage and Validation

`server/authorizationRedirectHardening.test.ts` validates canonical acceptance and rejects HTTP, base-domain, lookalike-domain, embedded-credential, explicit-port, and JavaScript destinations. `server/uiLayout.test.ts` additionally protects the client-side guard by requiring validation before browser navigation.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused redirect hardening test | Passed: 7 assertions. |
| `pnpm test` | Passed: 46 test files and 215 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing primary client chunk advisory remains visible and unrelated to redirect validation. |

No OAuth authorization flow, app connection, task, model, media, browser agent, sandbox, storage, scheduled workflow, or external provider workload was started while applying this validation.
