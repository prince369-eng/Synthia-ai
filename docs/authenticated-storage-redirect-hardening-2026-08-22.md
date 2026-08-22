# Authenticated Storage Redirect Hardening

**Date:** 2026-08-22  
**Scope:** The authenticated `/manus-storage/*` proxy that resolves owner-authorized storage keys to short-lived backend-signed downloads.

## Finding

The storage proxy already normalized the requested key, required an authenticated owner, checked object access, and used `Cache-Control: no-store` before issuing a temporary redirect. It accepted the backend-returned URL without URL-shape validation and included raw exception messages in two structured diagnostic fields.

The signing service remains trusted infrastructure, but the redirect is still a security-sensitive handoff. A malformed return value should not become an arbitrary browser navigation, and exception text should not become an unredacted diagnostic field.

## Implemented Boundary

The proxy now accepts a signing-service destination only when it parses as a credential-free HTTPS URL with the default HTTPS port. It rejects non-URLs, HTTP URLs, JavaScript URLs, embedded credentials, and explicit non-default ports before any redirect is emitted. Invalid signing responses produce the same generic `502` backend-error response rather than exposing their content.

| Control | Behavior |
|---|---|
| Object key | Retains existing traversal and ambiguity rejection before lookup. |
| Object owner | Retains existing authenticated owner-scoped access check. |
| Signed redirect | Requires parsed HTTPS, no userinfo, and no explicit non-default port. |
| Redirect response | Uses `307`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`. |
| Proxy diagnostics | Emits stable error types rather than raw exception messages. |

The proxy continues to redirect to the configured storage service instead of proxying artifact bytes through the application. It does not force all artifacts to download because the product has a separate, intentionally isolated HTML website-preview path; this update hardens the owned storage redirect boundary without changing that feature’s behavior.

## Validation

`server/securityHardening.test.ts` now validates the canonical signed-URL policy and asserts that storage-proxy catch paths use classified diagnostics rather than `err.message` text.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused storage hardening test | Passed: 4 assertions. |
| `pnpm test` | Passed: 47 test files and 223 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing client bundle-size advisories remain unrelated to storage delivery. |

No storage object was fetched, uploaded, or deleted while implementing or validating this change. No task, model, media, browser agent, sandbox, connector authorization, scheduled workflow, or external provider workload was started.
