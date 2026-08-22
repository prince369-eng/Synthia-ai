# tRPC Diagnostic Redaction

**Date:** 2026-08-22  
**Scope:** Server-side tRPC error formatting and structured diagnostics.

## Finding

The tRPC formatter already returned a generic message to the client for `INTERNAL_SERVER_ERROR` and added a request identifier without exposing a stack. Its associated warning log, however, used the raw `error.message` as the log message. Exception text can contain upstream implementation details, user-controlled values, or provider response content, so it is not appropriate as an operational log message.

## Implemented Boundary

The formatter now emits a constant diagnostic message, `tRPC request failed`, with stable structured metadata: event name, tRPC code, procedure path, and authenticated user identifier when available. It retains the generic public message for internal errors and preserves intended public messages for explicit tRPC validation, authentication, authorization, and rate-limit errors.

| Boundary | Behavior |
|---|---|
| Client-visible internal error | Remains `An unexpected server error occurred.` |
| Client-visible intentional tRPC error | Retains its procedure-authored user-facing message. |
| Server diagnostic event | Carries stable code, path, and user metadata with a constant message. |
| Raw exception message | No longer forwarded to the tRPC logger message field. |

This change does not alter request authorization, task ownership, response status codes, rate limits, or client redirect behavior. Existing field-level logger redaction remains in place for credentials and tokens.

## Validation

The structured-logging regression now includes the tRPC formatter and rejects direct console output, raw `error.message` in structured payloads, and raw `error.message` passed as a logger message. Existing security tests continue to verify the related server hardening boundaries.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused logging and security tests | Passed: 4 assertions. |
| `pnpm test` | Passed: 46 test files and 218 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing client chunk advisories remain unrelated to server diagnostic handling. |

No task, model, media, browser agent, sandbox, storage, connector authorization, scheduled workflow, or external provider workload was started while implementing or validating this hardening.
