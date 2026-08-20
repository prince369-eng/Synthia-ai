# Synthia AI Go-Live Credential Checklist

**Purpose.** This document is the single secure-configuration inventory for bringing Synthia AI live. Enter values only through the project secret manager or an ignored local `.env` file. Do not place credentials in source control, task prompts, browser forms, screenshots, or chat messages.

## Current implementation status

Synthia’s PostgreSQL schema is already migrated and the application currently has a compact authenticated workspace, provider readiness catalog, vision-aware attachments, authenticated voice transcription routing, server-side Gemini media adapters, task-owned artifact persistence, and credential-gated image/video controls. These controls remain unavailable until their provider values are configured and end-to-end verification succeeds.

| Capability | Selected production direction | Current state | Required before enabling |
|---|---|---|---|
| Text-agent execution | Groq, OpenRouter, Gemini, and/or DeepSeek | Implemented, not configured | At least one provider API key and model routing configuration |
| Vision understanding | Gemini or another configured vision model | Implemented, not configured | `GEMINI_API_KEY` and a `SYNTHIA_VISION_MODELS` entry |
| Voice input | Authenticated transcription route | Implemented, provider-gated | Transcription service configuration available in the hosted runtime |
| Image generation | Gemini `gemini-3.1-flash-image` | Implemented, unavailable by default | Gemini key, model selection, artifact storage, and live verification |
| Video generation | Gemini Omni Flash | Implemented, unavailable by default | Gemini key, model selection, artifact storage, polling verification, and live verification |
| Video as task input | Secure attachment plus sandbox processing | Implemented | Object storage, sandbox, queue, and live provider validation |

## Required values by service

| Service group | Secure configuration values | Requirement | Purpose |
|---|---|---|---|
| Synthia task state | `SYNTHIA_POSTGRES_URL` | Already configured/migrated; retain for production | Event-sourced tasks, task metadata, deliverables, attachments, and usage records |
| Queue and realtime | `REDIS_URL`, `REDIS_TLS_ENABLED` | Required | BullMQ jobs, retry/recovery, rate-limit counters, and event fan-out |
| Primary LLM routing | One or more of `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` | At least one required | Autonomous planning and task execution; additional keys provide fallback |
| Model configuration | `SYNTHIA_ORCHESTRATOR_PROVIDER`, `SYNTHIA_ORCHESTRATOR_MODEL`, `SYNTHIA_SUBTASK_PROVIDER`, `SYNTHIA_SUBTASK_MODEL`, `SYNTHIA_AVAILABLE_MODELS`, `SYNTHIA_VISION_MODELS` | Required for configured model selection | Defines the task model catalog and vision-capable choices; vision values use `provider:model` entries |
| Gemini image generation | `GEMINI_API_KEY`, `SYNTHIA_IMAGE_PROVIDER=gemini`, `SYNTHIA_IMAGE_MODELS=gemini-3.1-flash-image` | Required for image generation | Enables the selected Gemini image adapter after readiness checks |
| Gemini video generation | `GEMINI_API_KEY`, `SYNTHIA_VIDEO_PROVIDER=gemini-omni-flash`, `SYNTHIA_VIDEO_MODELS=gemini-omni-flash` | Required for video generation | Enables the selected Gemini Omni Flash video adapter after readiness checks |
| Web research | `TAVILY_API_KEY`, `SERPER_API_KEY`, `SYNTHIA_SEARCH_PRIMARY` | At least one recommended; both recommended for failover | Search tools used by autonomous tasks |
| Isolated execution | `SYNTHIA_SANDBOX_PROVIDER=e2b`, `E2B_API_KEY`, `E2B_TEMPLATE_ID`, `E2B_SANDBOX_TIMEOUT_SECONDS`, `SYNTHIA_SANDBOX_REGION` | Required for production computer execution | Secure browser, filesystem, terminal, and media processing in isolated sandboxes |
| Artifact storage | Select S3 or R2 through `SYNTHIA_STORAGE_PROVIDER` | Required | Stores task inputs and generated artifacts outside the database |
| AWS S3 option | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, optional `AWS_S3_ENDPOINT` | Required only when S3 is selected | Durable task artifact storage |
| Cloudflare R2 option | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | Required only when R2 is selected | Durable task artifact storage |
| Notifications | `SYNTHIA_EMAIL_PRIMARY`, `SYNTHIA_EMAIL_FROM`, plus `RESEND_API_KEY` and/or `POSTMARK_SERVER_TOKEN`, `POSTMARK_MESSAGE_STREAM` | One provider required if email notifications are enabled | Task completion and approval notifications; second provider is failover |
| Application security | `SYNTHIA_PUBLIC_APP_URL`, `SYNTHIA_ENCRYPTION_KEY`, `SYNTHIA_LOG_LEVEL`, `SYNTHIA_EVENT_RETENTION_DAYS`, `SYNTHIA_SANDBOX_RETENTION_DAYS` | Required for production hardening | Public origin, encrypted integration tokens, logs, and retention controls |
| Optional user integrations | OAuth client ID/secret pairs for GitHub, Google, Notion, and Slack | Optional | Enables only the integrations you intend to expose |

## Managed values not to supply again

The managed Manus authentication account-store values (`DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, and `OWNER_NAME`) are already injected by the hosted project. Do not replace `DATABASE_URL` with the Synthia PostgreSQL task-store URL. Built-in Forge values are also managed separately and must not be copied into application source.

## Safe activation order

Start with Redis, one LLM key, model routing, E2B, and one storage provider. Then run an authenticated text task end to end. Add `SYNTHIA_VISION_MODELS` and test image understanding through a user-owned image attachment. Next activate the selected Gemini image and video variables, verify the generated artifact ownership and retrieval lifecycle, and only then enable the corresponding center controls. Finally configure search and email failover, publish the site, and verify the scheduling callback before creating task-linked schedules.

> **Credential boundary.** A configured API key does not by itself mark a provider ready. Synthia marks capabilities usable only after its server-side adapter, model configuration, storage path, task ownership checks, and runtime readiness are present.

## Provider references

The selected Gemini image and video model directions were derived from the official Gemini API documentation. The exact model availability in your Google project must be confirmed at configuration time. [1] [2]

## References

[1]: https://ai.google.dev/gemini-api/docs/image-generation "Gemini API image generation documentation"
[2]: https://ai.google.dev/gemini-api/docs/omni "Gemini API Omni documentation"
