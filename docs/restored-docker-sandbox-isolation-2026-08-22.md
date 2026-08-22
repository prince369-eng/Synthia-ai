# Restored Docker Sandbox Isolation

**Date:** 2026-08-22  
**Scope:** The local Docker sandbox fallback used only outside production.

## Finding

New local Docker sandboxes were started with network isolation, a read-only root filesystem, constrained writable temporary filesystems, memory and CPU limits, and a PID cap. The restore path started a container from a checkpoint image with only network isolation. A restored local sandbox could therefore have a broader runtime profile than its original container.

## Implemented Boundary

Fresh and restored Docker sandbox starts now share one runtime-argument builder. Both paths use the same development-only host-isolation controls: no network, read-only root filesystem, constrained `/tmp` and `/workspace` mounts, a 1 GB memory cap, one CPU, and a 256-process limit.

> Docker remains a local development fallback and is disabled in production. This change preserves that gate; it does not create, restore, or execute a sandbox while validation runs.

| Boundary | Protection |
|---|---|
| Fresh container start | Uses the shared isolation builder rather than a separate argument list. |
| Restored container start | Uses the same isolation builder, so checkpoint recovery cannot silently broaden its runtime profile. |
| Docker descriptor | Accepts only application-owned `synthia-` identifiers composed of a bounded safe character set. |
| Docker CLI invocation | Validates descriptors before `exec`, `commit`, and `rm`, and uses `--` before the validated container identifier. |
| Checkpoint reference | Retains strict character validation before it is supplied as the restored image reference. |

The command executed inside an allowed local sandbox remains governed by the pre-existing terminal and task approval policies. This hardening does not make Docker a production provider, relax the E2B/HopX gates, activate browser access, or change external service configuration.

## Validation

`server/agent/sandbox.test.ts` now verifies that the shared Docker run arguments contain all runtime isolation controls and that only Synthia-owned descriptors are accepted. Existing terminal-policy coverage continues to reject execution, chaining, traversal, and non-workspace paths.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused sandbox regression | Passed: 4 assertions. |
| `pnpm test` | Passed: 46 test files and 217 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing client chunk advisories remain unrelated to server-side sandbox isolation. |

No Docker container, sandbox, task, model, media, browser agent, storage, queue, connector authorization, scheduled workflow, or external provider workload was started during this implementation or validation.
