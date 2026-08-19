# Deploying Synthia AI

Synthia AI separates its **control plane** from its **durable worker plane**. The HTTP application is stateless and may scale horizontally. The worker runs continuously, consumes Redis jobs, persists every state transition in PostgreSQL, and uses E2B for isolated production sandboxes. The worker must not run as a detached child process of the HTTP server.

| Component | Required environment | Scaling rule |
|---|---|---|
| Control plane | `SYNTHIA_POSTGRES_URL`, `REDIS_URL`, OAuth variables, `JWT_SECRET` | Scale horizontally; no task-local state |
| Worker | All control-plane variables plus provider credentials | Scale by queue depth and configured concurrency |
| E2B | `E2B_API_KEY`, optional template ID and allowed hosts | One isolated sandbox per active task |
| PostgreSQL | `SYNTHIA_POSTGRES_URL` | Managed external service; run the reviewed migration once |
| Redis | `REDIS_URL` | Managed external service; required for queueing and distributed rate limits |
| Artifact storage | R2 or S3 credentials | Managed external service; only object references live in PostgreSQL |

## Local development with Docker Compose

Create an ignored `.env` file by copying `.env.example`, set `SYNTHIA_LOCAL_POSTGRES_PASSWORD`, `SYNTHIA_LOCAL_REDIS_PASSWORD`, `JWT_SECRET`, and the OAuth variables needed for login. Supply real provider credentials only for integrations you intend to invoke. Build the isolated local fallback image with `docker build -t synthia-sandbox:latest -f infrastructure/sandbox/Dockerfile .`, then start the stack with `docker compose up --build`.

The compose stack starts a real PostgreSQL instance, a password-protected Redis instance, a one-time migration job, the control plane, and an independent worker. It does not mount a Docker daemon into the worker. The local Docker sandbox implementation therefore requires a separately managed, security-reviewed development Docker host; E2B is the production sandbox path.

## Production topology

Provision external PostgreSQL, Redis, object storage, model-provider keys, search keys, E2B, and an email provider. Add their server-only values in the deployment secret manager, then apply `drizzle/0000_aromatic_wrecker.sql` against the database named by `SYNTHIA_POSTGRES_URL`. Run the control plane and worker as separate process groups from the same application image. Scale workers based on queue lag and sandbox concurrency, not by HTTP traffic.

> Do not configure `SYNTHIA_SANDBOX_PROVIDER=docker` in production. The production sandbox provider is E2B. Docker fallback is deliberately development-only and rejects production execution.

The Agent’s Computer **Screen** tab displays browser screenshots only from an E2B desktop sandbox. The local Docker fallback is intentionally code-only: it supports bounded filesystem and terminal work but has no graphical browser, URL navigation, or screen-capture implementation.

The repository intentionally has no root `Dockerfile`. The managed Node control-plane deployment can use its generated build path, while `infrastructure/Dockerfile.local` exists only for Docker Compose and external container platforms. This avoids accidentally overriding the managed deployment contract while retaining a full, portable local-stack definition.
