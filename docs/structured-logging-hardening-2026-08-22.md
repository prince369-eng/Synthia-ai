# Structured Logging Hardening

**Date:** 2026-08-22  
**Scope:** Server-side diagnostics for request handling, authentication, task governance, connected applications, event streaming, notification delivery, model retries, and process startup.

## Purpose

Synthia now routes the audited server failure paths through its existing Pino logger, which carries the common service identity, log-level policy, and central field-redaction configuration. The change removes direct `console` diagnostic output from those application paths and replaces interpolation-based messages with controlled, structured events.

> **Operational logs are diagnostic metadata, not a secondary channel for user input, credentials, tokens, raw upstream bodies, or arbitrary exception text.**

## Implemented Boundary

| Area | New diagnostic behavior | Deliberately excluded from the event payload |
|---|---|---|
| tRPC task and governance mutations | Emits a stable event name, the relevant owner/task identifier, and an error class. | Arbitrary exception messages and request payloads. |
| OAuth and session handling | Emits configured/missing state and safe session-failure classifications. | OAuth authorization codes, bearer tokens, cookie values, JWT payloads, and user profile payloads. |
| LLM retry path | Emits retry number, configured retry bound, and upstream status where available. | Model prompts, URLs, headers, response bodies, and network exception text. |
| Connected-app authorization | Emits app slug, owner identifier, provider when applicable, and error class. | Authorization session secrets, access tokens, refresh tokens, and upstream error bodies. |
| Notifications and task-event stream recovery | Emits status or error class while retaining the existing safe caller-facing fallback. | Notification content, response details, task event contents, and upstream exception text. |
| Server and static startup | Emits selected port or a stable startup/build failure event. | Absolute build path details and arbitrary startup exception text. |

The central logger retains redaction for `apiKey`, access and refresh tokens, encrypted tokens, authorization headers, and passwords. The migration does not alter API responses, task state, authorization decisions, rate limits, queue behavior, provider calls, or external-workload gates.

## Regression Coverage

`server/loggingHardening.test.ts` establishes a source-contract boundary for the audited server modules. It verifies that request, connector, event-stream, and infrastructure paths use the configured logger rather than direct console methods, avoid passing raw `error.message` into structured warning/error payloads, and retain the central credential-redaction fields.

## Validation

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused logging and security regressions | Passed: 4 assertions. |
| `pnpm test` | Passed: 43 test files and 206 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing client bundle-size advisories remain unrelated to logging behavior. |

No task, model, media, browser agent, sandbox, storage, connector authorization, scheduled workflow, or external provider workload was started while applying this hardening.
