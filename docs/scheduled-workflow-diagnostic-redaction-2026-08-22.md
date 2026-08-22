# Scheduled-Workflow Diagnostic Redaction

**Date:** 2026-08-22  
**Scope:** Failure diagnostics for the cron-only scheduled-workflow endpoint.

## Finding

The scheduled-workflow endpoint already authenticates its caller as a cron identity, requires the scheduler task UID, gates execution on queue availability, and claims a rounded-minute run slot before creating any task. It returns a generic error to callers on unexpected failure. Its server diagnostic event, however, still placed the raw exception message in the structured `error` field.

## Implemented Boundary

The failure event now carries only a stable event name, the request method, and an `errorType` classification derived from the exception constructor. The human-readable log message is constant, while the HTTP response remains the existing generic `scheduled-workflow-failed` message.

| Control | Behavior |
|---|---|
| Caller identity | Continues to require an authenticated cron principal with a scheduler task UID. |
| Duplicate protection | Continues to claim the workflow run before task creation and skips duplicate slots. |
| Public failure response | Remains generic; raw exception content is not returned. |
| Server diagnostic | Uses stable error classification rather than raw exception text. |
| Queue action | Remains unchanged and was not invoked during this validation. |

This correction does not schedule a workflow, enqueue a task, alter the workflow record, or change the existing approval and ownership model.

## Validation

The structured logging regression now includes the scheduled-workflow module and rejects raw `error.message` fields or logger-message arguments in its warning/error calls. Existing security coverage continues to protect the generic caller-facing failure behavior.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused logging and security tests | Passed: 6 assertions. |
| `pnpm test` | Passed: 47 test files and 223 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing client chunk advisories remain visible and unrelated to this server diagnostic boundary. |

No schedule was created or run, and no task, queue, model, media, browser agent, sandbox, storage, connector authorization, or external provider workload was started during this hardening.
