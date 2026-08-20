# Provider Evaluation: Agnes AI, AIHubMix, and Hyperbrowser

## Scope and quota boundary

This evaluation covers the user-approved addition of **Agnes AI**, **AIHubMix**, and **Hyperbrowser** alongside Synthia’s existing model and sandbox providers. No provider credential has been collected, no model, image, video, audio, reasoning, or browser-automation request has been sent, and all live validation remains separately opt-in.

## Official documentation findings

| Provider | Officially documented integration surface | Capabilities relevant to Synthia | Credential and safety boundary |
| --- | --- | --- | --- |
| Agnes AI | OpenAI-compatible API at `https://apihub.agnes-ai.com/v1` | Text, reasoning, code assistance, image creation/editing, video and synchronized audio-video generation, and multimodal understanding | Bearer API key only; server-side storage is required, and the documentation warns against exposing keys in client code, repositories, screenshots, or public configuration. |
| AIHubMix | OpenAI-compatible, Gemini-compatible, and Anthropic-compatible interfaces | Text, image/video generation, embeddings, TTS, and reasoning-capable models | API key required; exact base URL and discovery request shape must be taken from the current quick-start/API reference before implementation. The public model listing is a catalog, not a guarantee that every listed model is free or available to every key. |
| Hyperbrowser | Cloud-browser service with REST and SDK support, including Puppeteer and Playwright connectivity | Remote browser sessions, AI-agent browsing, data collection, testing, automation, CAPTCHA handling, and session replay | API key and remote session are required; every session must be server-owned, task-scoped, and cleaned up. No personal-browser data may be transferred. |

## Integration decisions pending the remaining official review

Agnes AI can be evaluated as a server-side OpenAI-compatible fallback for text and reasoning, with separate capability flags for media generation. Its model catalog, pricing, and model identifiers must remain dynamic or configuration-driven rather than hard-coded as “free.”

Agnes AI’s quick-start documents `POST https://apihub.agnes-ai.com/v1/chat/completions` with an `Authorization: Bearer` key and an OpenAI-style message payload. The example model is `agnes-2.0-flash`. Synthia can therefore reuse its existing OpenAI-compatible text adapter shape for a server-side-only Agnes model provider; streaming, tool calling, and media routes require model-specific documentation before activation.

AIHubMix can be evaluated as a multi-protocol gateway. Its current quick start documents `POST https://aihubmix.com/v1/chat/completions` with a bearer token and an OpenAI-style message payload, with `https://api.inferera.com` as the documented fallback domain. The model-management API documents `GET https://aihubmix.com/api/v1/models` with bearer authentication and a JSON `data` array of model records. Those records include `model_id`, `types`, `features`, `input_modalities`, context/output limits, and pricing metadata. Synthia should initially use a narrow OpenAI-compatible text/reasoning adapter and this model-list endpoint as a separately opt-in non-generative readiness check; native media interfaces remain disabled until the user supplies a key and explicitly approves an isolated live test. Synthia must not use the public model list to assume availability, price, or quota.

AIHubMix documents image submission as `POST https://aihubmix.com/v1/models/<provider/model_id>/predictions` with a bearer credential and an `input` object containing at least `prompt`; the model path must include the provider namespace. An asynchronous response can include a task ID, and the result is retrieved from `GET https://api.aihubmix.com/v1/tasks/<taskId>`. Its video API is explicitly asynchronous: `POST /v1/videos` submits work, `GET /v1/videos/{video_id}` reports `queued`, `in_progress`, `completed`, or `failed`, `GET /v1/videos/{video_id}/content` returns the MP4, and `DELETE /v1/videos/{video_id}` requests cleanup. The provider documents short-lived output links, so Synthia must persist completed bytes to its own storage before task delivery. These contracts establish only the adapter shape; Synthia must not submit an image, video, or audio request until the credential is configured and the user explicitly approves a narrow live generation test. [5] [6]

For audio output, AIHubMix documents `POST https://aihubmix.com/v1/audio/speech`. The API returns the completed audio bytes directly, applies a 4,096-character input cap, accepts a configured voice and response format, and has model-specific format and speed limitations. An implementation can therefore validate the supported MIME output locally, but must remain credential-gated and require explicit approval before it sends the first generation request. [7]

The AIHubMix public catalog currently offers modality filters for text, image, speech, video, transcription, embeddings, rerank, and OCR, plus category filters including coding and Free. The public catalog uses model IDs with a `-free` suffix and displays zero input/output token prices for the listed examples. This is catalog metadata only: provider selection must remain controlled by a user-owned allowlist because model availability, rate limits, terms, and non-token tools can differ from the displayed input/output price.

Hyperbrowser must remain a credential-gated, server-only remote-browser provider. The official documentation describes sessions as isolated cloud browser instances and returns a session ID, WebSocket endpoint, live-view URL, computer-action endpoint, status, and credits used. It supports connection through Playwright, Puppeteer, and other CDP-compatible tools. The official sample explicitly stops a session in cleanup, and session duration is configurable from one to 720 minutes. Its operations may be added only through the existing server-side sandbox/browser abstraction, preserving task ownership, short server-enforced lifetimes, guaranteed session cleanup, approval gates for external effects, event-sourced audit records, and no access to the user’s personal browser session.

Stealth, proxies, CAPTCHA support, recordings, and profiles are documented provider capabilities but are not automatically enabled in Synthia. These features affect target-site interaction and may incur different quota or plan terms; each must stay disabled unless a task-level policy explicitly permits it and the provider configuration is set by an authorized application administrator.

Hyperbrowser’s current public pricing page lists a zero-cost plan with 5,000 included credits, one concurrent browser, and seven days of data retention. It prices active browser instances at 100 credits per hour, billed per second. Synthia must treat this as an external provider quota, never as a guaranteed entitlement: a task may use Hyperbrowser only after the service is configured and the agent’s approval policy allows the specific operation.

The official lifecycle guide defines `active`, `closed`, and `error` session states. It documents idempotent session stopping and recommends `try`/`finally` cleanup, explicit timeouts, session-state monitoring, orphan-session audit, and network-failure cleanup. Synthia’s adapter contract therefore requires best-effort idempotent cleanup on normal completion, failures, cancellation, and process shutdown; it must not rely on provider timeouts alone.

The guessed AIHubMix URL `https://docs.aihubmix.com/en/quickstart` returned a documented 404. The documentation home contains an official **Quick Start** link; subsequent review must follow that link rather than rely on an inferred route.

## References

1. [Agnes AI API overview](https://agnes-ai.com/en/docs/overview)
2. [AIHubMix documentation overview](https://docs.aihubmix.com/en)
3. [AIHubMix public model catalog](https://aihubmix.com/models?tag=free)
4. [Hyperbrowser documentation](https://www.hyperbrowser.ai/)
5. [AIHubMix Image Generation API](https://docs.aihubmix.com/en/api/Image-Gen)
6. [AIHubMix Video Generation API](https://docs.aihubmix.com/en/api/Video-Gen)
7. [AIHubMix Text-to-Speech API](https://docs.aihubmix.com/en/api/TTS)
