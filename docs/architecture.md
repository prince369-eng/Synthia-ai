# Synthia AI Architecture

Synthia AI is an **event-sourced autonomous-agent platform**. A user provides a goal and the system creates an asynchronous task whose worker repeatedly performs a single `analyze → plan → select action → execute → observe` cycle. The task does not rely on an open browser tab. The ordered event log is the system of record for the task thread, live status, timeline, replay, audit trail, file changes, approvals, and final deliverables.

## Deployment Boundaries

| Service | Responsibility | Runtime boundary | Scaling model |
|---|---|---|---|
| Web control plane | Authenticated UI, typed API, task CRUD, settings, read models, and authorization | Managed Node web application | Stateless horizontal scaling |
| Realtime gateway | Authenticated task-event and screen-frame fan-out | Node websocket service backed by Redis pub/sub | Horizontally scalable; no task state in memory |
| Orchestrator workers | One-action agent cycles, tool policy checks, usage updates, retries, and checkpoints | Dedicated Node worker deployment | Queue-driven horizontal scaling |
| Sandbox provider | Browser, code, filesystem, screenshots, and isolated process execution | E2B in production; Docker fallback in development | One isolated sandbox per active task |
| PostgreSQL | Durable relational and event data | Managed PostgreSQL | Primary data store with transactional sequence allocation |
| Redis | Queue transport, pub/sub, rate limits, distributed locks, and ephemeral stream cursors | Managed Redis | Shared external service |
| Object storage | Deliverables, frames, replay assets, and sandbox checkpoints | Cloudflare R2 or Amazon S3 | Durable object store |

> The managed web application is the **control plane**, not the agent worker fleet. Agent orchestration and sandbox work must be deployed as durable workers because task execution can run for minutes or hours and must survive client disconnects.

## Provider Selection

The runtime configuration is intentionally provider-agnostic. `SYNTHIA_SANDBOX_PROVIDER=auto` selects E2B when `E2B_API_KEY` is configured and Docker in a local development environment otherwise. Every sandbox implementation conforms to the same interface: create, execute, browser operation, screenshot, filesystem read/write, checkpoint, restore, and destroy. No application route is permitted to depend directly on an E2B or Docker SDK.

| Capability | Primary configuration | Failover or development alternative |
|---|---|---|
| Orchestrator LLM | OpenRouter, Groq, Gemini, or DeepSeek | A separate configured sub-task provider |
| Web search | Tavily | Serper |
| Sandbox | E2B | Local Docker implementation |
| Object storage | Cloudflare R2 or Amazon S3 | The other S3-compatible provider |
| Transactional email | Resend | Postmark |
| Job and realtime state | Managed Redis | Local Redis for Docker Compose |
| Durable task data | Managed PostgreSQL | Local PostgreSQL for Docker Compose |

## Security Model

Every API operation is authenticated and authorized against task ownership. The worker, not the browser, enforces risk policy. External-effect operations always generate a pending approval record and halt the task before the action executes. A task's sandbox is isolated from other tasks and has a bounded duration, iteration count, filesystem scope, and egress policy. Production DNS must be routed through a controlled resolver that only resolves approved egress destinations; HTTP restrictions without DNS restrictions are insufficient.

Provider credentials are secret-manager values only. Integration tokens are encrypted at rest with an application encryption key, never emitted in event payloads or logs, and are redacted from errors. The application logs structured task IDs, event IDs, durations, and status codes but never request credentials, sandbox secrets, or model prompts containing unredacted keys.

The E2B implementation uses the official JavaScript SDK's desktop sandbox variant. Its contract provides isolated on-demand desktop sandboxes, command execution, filesystem APIs, lifecycle controls, mouse and keyboard operations, and PNG screenshots. This supports the Screen, Terminal, Code, and Files views without running sandbox code inside the web control plane. [1]

The Gemini model adapter uses the documented `v1beta/{model}:generateContent` endpoint with `contents`, `systemInstruction`, and `generationConfig` in the request body. It preserves the provider-reported usage metadata so the credit ledger can price actual usage instead of estimating after execution. [2]

## Task State and Replay

Each event gets a monotonically increasing `sequenceNumber` within its task, allocated transactionally. The worker appends events before publishing Redis notifications. The UI derives its thread, timeline, status, task plan, files, and replay cursor from those events, avoiding parallel mutable state. Screen frames and artifacts are stored in object storage and referenced from their events.

The task-context layers remain distinct. Working context is a bounded event window plus audited summaries. Task memory is its full event history. Cross-task memory is a separately reviewable table of durable facts. External connector and MCP data is fetched live for a tool invocation and is never silently converted into durable memory.

The browser receives an authenticated Server-Sent Events stream for each task. The stream accepts a sequence cursor, sends each ordered event after that cursor, and uses Redis pub/sub to wake subscribed streams after a committed worker event. A database-backed recovery read remains in place every 15 seconds in production, or every second when Redis is not configured; disconnects are therefore recoverable even across worker or realtime-service restarts. For production scale, the stream service runs independently from the autoscaling HTTP control plane.

## Required Deployment Variables

`.env.example` lists every supported service variable. For deployment, values must be placed in the environment's secrets manager. The public application may expose only `VITE_*` values explicitly intended for browsers. Service credentials, encryption keys, storage credentials, and model-provider keys must remain server-only.

The application data plane is PostgreSQL. `drizzle/0000_aromatic_wrecker.sql` is the initial non-destructive PostgreSQL schema migration. It must be applied against the external database designated by `SYNTHIA_POSTGRES_URL`; it is intentionally not applied to the managed MySQL development database because cross-dialect execution would be invalid.

## References

[1] [E2B Desktop Sandbox SDK documentation](https://docs.e2b.dev/)

[2] [Gemini GenerateContent API reference](https://ai.google.dev/api/generate-content)
