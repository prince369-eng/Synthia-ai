# Bunnyshell and Pixazo provider evaluation

## Quota-safety boundary

This evaluation does **not** provision sandboxes, invoke media generation, or send provider credentials. Any future live check must be explicitly approved by the user and run in a dedicated opt-in mode.

## Bunnyshell / hopx.ai sandbox candidate

The official Bunnyshell AI sandbox page describes hopx.ai as an isolated, ephemeral sandbox option for agent workloads. It advertises a REST API and TypeScript, Python, and Go SDKs for creating, executing in, reading files from, and destroying sandboxes. The provider describes configurable images, CPU, memory, timeouts, filesystem I/O, and streamed standard output/error.

HopX’s official API documentation confirms the integration contract: the Control Plane base URL is `https://api.hopx.dev`, with `/v1/sandboxes` and `/v1/templates` lifecycle resources; the provider returns a sandbox-specific VM Agent URL for code and file operations. Its API-key documentation specifies `HOPX_API_KEY` as the recommended environment variable and supports `Authorization: Bearer <key>` or `X-API-Key: <key>` for direct REST calls. The documentation identifies a template-listing operation as an API-key test, but that still contacts the service; Synthia must **not** execute it unless the user explicitly approves a live, non-generation connectivity check.

Synthia can therefore model Bunnyshell as a secure **alternate sandbox provider** once `HOPX_API_KEY` is supplied. The initial adapter must remain disabled by default and must not provision, execute, or destroy sandbox resources during routine tests.

The official JavaScript SDK package is `@hopx-ai/sdk`. Its documented lifecycle maps to `Sandbox.create()` with a template, `sandbox.commands.run()` for shell execution, `sandbox.files.read()` / `write()` / `writeBytes()` for `/workspace` transfer, and `sandbox.kill()` for cleanup. Synthia will call those methods only after a user selects HopX and has provided the required credentials.

Sources: <https://www.bunnyshell.com/ai-sandbox-environments/>, <https://docs.hopx.ai/api/introduction>, <https://docs.hopx.ai/api-key>, <https://docs.hopx.ai/sdk/javascript/quickstart>, <https://docs.hopx.ai/api/vm-agent/overview>

## Pixazo media-provider candidate

The official Pixazo API page presents one API for image, video, and audio generation and states that models are selectable through a request parameter. Its free-tier reference documents unified JSON POST routes authenticated with `Ocp-Apim-Subscription-Key`: `https://gateway.pixazo.ai/flux/text-to-image`, `https://gateway.pixazo.ai/ltx/text-to-video`, and `https://gateway.pixazo.ai/tracks/generate-music`. Pixazo describes those routes as fair-use preview endpoints; Synthia must treat the provider's free allowance as unverified and may not consume it during implementation or routine tests.

Pixazo’s official Seedance and Gemini Omni references confirm the asynchronous contract used by many premium routes: a model-specific gateway endpoint returns `request_id`, `status`, and `polling_url` immediately, and can notify an HTTPS callback provided through `X-Webhook-URL`. Completion payloads carry terminal status and media output URLs, while duplicate webhook delivery must be handled idempotently using `request_id`.

This provider uses model-specific gateway routes rather than the Gemini adapter’s API shape. Synthia must introduce a dedicated Pixazo adapter that accepts `PIXAZO_API_KEY` and a strictly allowlisted model route. It must not submit a media job during routine testing, inspect provider balance, or register callbacks before the user explicitly opts in to a live, quota-consuming test. Its readiness status should only mean that a key and an approved route are configured; it must not claim an available free quota.

Sources: <https://www.pixazo.ai/api>, <https://www.pixazo.ai/api/free>, <https://www.pixazo.ai/models/seedance>, <https://www.pixazo.ai/models/gemini-omni>
