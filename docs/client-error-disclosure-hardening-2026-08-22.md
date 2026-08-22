# Client Error-Disclosure Hardening

**Date:** 2026-08-22  
**Scope:** Browser-side query, mutation, and bootstrap diagnostics.

## Purpose

The client previously passed raw error objects to browser-console diagnostics and rendered a truncated bootstrap exception message inside the visible fallback UI. Errors can carry implementation details, upstream messages, user-supplied values, or transport metadata, so they are not safe diagnostic payloads by default.

Synthia now classifies client failures into a bounded set of categories and logs only a stable scope plus that category. The visible startup fallback is generic and actionable without displaying a raw exception.

> A browser diagnostic is not a safe place for untrusted exception text. The client now records only the failure scope and category, while server-side failures retain their separate redaction-aware structured logging boundary.

## Implemented Boundary

| Failure path | Diagnostic emitted | Excluded detail |
|---|---|---|
| Query cache | `scope: "query"` and one of `network`, `unauthorized`, `request`, or `unknown`. | Request content, raw tRPC error message, headers, tokens, and upstream body. |
| Mutation cache | `scope: "mutation"` and the same bounded category. | Mutation input, raw error message, and provider response detail. |
| Bootstrap catch | `scope: "bootstrap"` and the bounded category. | Exception message, stack, runtime path, and user-supplied error content. |
| Visible startup fallback | A generic reload/session recovery instruction. | The prior per-error preview detail element and all exception text. |

The existing explicit-logout and unauthorized redirect behavior remains unchanged. This change does not modify session storage behavior, tRPC request semantics, task state, API responses, authentication authority, or external-service configuration.

## Validation

`server/clientErrorHardening.test.ts` ensures the client uses the classifier and stable reporting function for query, mutation, and bootstrap paths. It rejects the former raw console calls, visible bootstrap-error element, and error-message interpolation.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused client-error regression | Passed. |
| `pnpm test` | Passed: 45 test files and 208 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing primary application chunk advisory remains unrelated to this disclosure boundary. |

No task, model, media, browser agent, sandbox, storage, connector authorization, scheduled workflow, or external provider workload was started during this client-only hardening.
