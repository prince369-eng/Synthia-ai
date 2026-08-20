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

## Pixazo Free-Tier Catalog Research (Preliminary)

Pixazo’s official public catalog and free API pages advertise free image, video, and audio generation options, while its pricing page states that free users do not receive recurring monthly credits. The search results specifically identify **Flux 1.0 (Free)** as a free image API candidate. This is a preliminary catalog finding only: Synthia must verify exact request model identifiers, applicable quota rules, and audio/video free availability from the provider’s official model/API pages before placing any model on a user-selectable allowlist.

Pending source verification: <https://www.pixazo.ai/models>, <https://www.pixazo.ai/api/free>, <https://www.pixazo.ai/models/flux>, and <https://www.pixazo.ai/pricing-plan>.

### Verified free-tier candidates and boundary

The official Pixazo free API page identifies five free-tier models and request slugs: `flux` for Flux Schnell image generation, `sd-3.5` for Stable Diffusion 3.5 image workflows, `sdxl` for SDXL image generation, `ltx` for LTX text/image/video-to-video generation, and `tracks` for Pixazo Tracks music/song generation. It documents `POST https://gateway.pixazo.ai/<model_id>/<operation>` with `Ocp-Apim-Subscription-Key`, giving the examples `/flux/text-to-image`, `/ltx/text-to-video`, and `/tracks/generate-music`. The same page states fair-use limits of 60 requests per minute per model during preview. These slugs are suitable for a narrow allowlist but **not** for an automatic generation test.

Pixazo’s current general pricing page distinguishes a seven-day, 100-credit trial from the post-trial free plan. It states that free users receive no recurring monthly credits, while some in-house models may have a fair daily limit under the applicable plan. Therefore Synthia must label these models as provider-advertised free-tier candidates, surface quota caveats, and preserve the existing explicit user-start requirement before any request is submitted.

AIHubMix’s public gallery identifies 51 no-card free models and currently displays free-suffixed model IDs, including `glm-5.2-free`, `gemini-3.7-flash-free`, `coding-glm-5.2-free`, `coding-kimi-k3-free`, `gpt-oss-20b-free`, `gemini-3.1-flash-image-preview-free`, and `gpt-image-2-free`. Its official Models API returns the authoritative key-specific catalog along with model type, features, modalities, context limits, and pricing metadata; a bearer-authenticated call must therefore remain Synthia’s source of truth for availability. Synthia may present only a curated free-model subset and must not infer that a public gallery model is available to a particular key or that non-token media usage is free.

### Agnes AI Text Model Verification (2026-08-20)

The official Agnes 2.0 Flash documentation identifies the exact model ID as `agnes-2.0-flash` and lists its current input and output token price as `$0 / 1M tokens`. The model is documented for agent workflows, tool calling, coding, reasoning, and image understanding through the OpenAI-compatible chat-completions endpoint. Synthia may therefore present this specific text-model candidate in the configured model catalog, while preserving the credential gate and the no-automatic-live-request policy. The Agnes 2.5 Pro Alpha documentation explicitly identifies that model as paid, so it is excluded from the free-tier catalog.

### Authenticated UI Verification (2026-08-20)

After the configuration reload, the authenticated Synthia Settings route showed the expected Models section and began its task-model query. The first visual frame was an intentional loading state, so capability availability must be confirmed only after the query resolves; no model selection, provider action, media request, browser navigation, or other external workload was initiated during this review.

The authenticated task composer subsequently displayed the configured catalog as exact model IDs with only user-facing capability labels. The model menu is intentionally bounded to 16rem and vertically scrollable, so the initial seven available choices do not expand beyond the compact composer area; no provider names, credential state, or configuration labels are shown in the picker.

After the final preview restart, the authenticated workspace initially returned its expected protected-query loading shell while task and catalog data reconnected. This review has not initiated any model, media, browser, or other provider workload; only the settled UI state is relevant for the final visual verification.

The settled authenticated composer now shows the complete seven-model catalog inside the compact selector with a visible bounded scrollbar. It labels `agnes-2.0-flash` as `Text · Vision`, while the curated AIHubMix entries remain `Text`; the entries do not disclose provider names, credentials, or configuration state. This interaction only opened the selector and did not select a model or create a task.

## Public-web agent policy basis

The user requested research-capable navigation to broad public websites, equivalent in intent to a general browser. This is compatible with a general-public-web mode but not with unrestricted network access. The [OWASP Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) identifies localhost, private/internal address ranges, cloud metadata services, non-HTTP schemes, and unsafe redirects as core SSRF risks. Synthia’s public-web policy must therefore accept only `http` and `https` destinations, reject literal IP hosts and local/private/link-local/metadata hostnames before remote navigation, require a public DNS resolution result, disable credential injection, and keep any authenticated, publishing, purchasing, or destructive browser action behind an approval gate. Broad public research can be permitted without exposing the sandbox or allowing the browser to reach private infrastructure.

## Pixazo Endpoint Detail and Free-Tier Caution (2026-08-20)

Pixazo’s [free API page](https://www.pixazo.ai/api/free) states that its fair-use preview tier exposes **Flux Schnell**, **Stable Diffusion 3.5**, **SDXL**, **LTX**, and **Pixazo Tracks** through one subscription key, claiming a 60-request-per-minute fair-use limit per model. It provides the concrete starter routes `POST /flux/text-to-image`, `POST /ltx/text-to-video`, and `POST /tracks/generate-music` on `https://gateway.pixazo.ai`, with `Ocp-Apim-Subscription-Key` authentication. It says free audio returns an MP3 clip, but the detailed Tracks reference instead documents an asynchronous `POST /tracks/v1/generate` request with a `request_id`, polling through `GET /v2/requests/status/{request_id}`, and a completion payload containing `output.media_url` and an audio MIME type.

The detailed Tracks reference also documents a `tracks` model ID and a queued asynchronous workflow. The SDXL reference exposes several distinct API routes and response shapes. These pages include pricing and paid-credit language that does not fully match the broad free-tier marketing statement. Synthia must therefore only use documented endpoints with adapter-specific response handling, retain its explicit media activation switch, and never claim blanket free availability or invoke a generation job merely to test entitlement. The current direct-response Pixazo adapter remains limited to the verified `flux` and `ltx` starter routes until asynchronous Tracks and other model-specific endpoints are implemented and separately tested.

### Pixazo Tracks Adapter Contract (2026-08-20)

The current official Tracks documentation specifies `POST https://gateway.pixazo.ai/tracks/v1/generate` with JSON input and the `Ocp-Apim-Subscription-Key` header. A successful submission returns `202` with `request_id`, `status: QUEUED`, and a polling URL. Synthia must poll `GET https://gateway.pixazo.ai/v2/requests/status/{request_id}` with the same credential until a terminal `COMPLETED`, `FAILED`, or `ERROR` state. A completed response includes `output.media_url` as a URL array and an audio media type; adapter retrieval must accept only HTTP(S) output URLs, enforce a bounded audio byte size, validate an `audio/*` content type, and persist task-owned bytes before delivery. The provider’s free page describes Tracks as the free-tier music and song option; Pixazo’s detailed model page controls the implementation contract where its general page and model route examples differ. Both pages describe preview fair-use limits but Synthia continues to require an explicit user-started task before any submission. [10] [11]

### Authenticated Workspace Recovery Check (2026-08-20)

After the managed preview restarted with the approved non-secret defaults, the authenticated task workspace recovered from its brief protected-query loading shell to the expected empty task state. The compact task composer rendered normally with its Media and model controls available. This check did not submit an audio, image, video, browser, or model request; the dedicated media-menu inspection remains a presentation-only verification step.

The authenticated Media menu then displayed **Image generation — Ready · flux**, **Video generation — Ready · ltx**, and **Audio generation — Ready · tracks**, along with a clear statement that ready tools run only inside an explicitly started task. The bounded model selector displayed `agnes-2.0-flash` with **Text · Vision**, while the curated AIHubMix entries remained labelled **Text**. Opening these menus did not select a model, create a task, or submit any provider workload.

After secure Groq configuration, Synthia’s existing read-only `GET /openai/v1/models` connectivity regression passed against the stored server-side credential. No inference request was made. The managed preview was restarted and the authenticated Settings workspace recovered normally to its user-facing General section; no Settings mutation or provider request was performed during that presentation check.

### LTX Readiness Mismatch Investigation (2026-08-20)

After a user reported that the Media panel showed Flux ready while LTX was unavailable, a sanitized runtime inspection confirmed the approved Pixazo enablement switch, Flux and LTX model allowlists, and the presence of a Pixazo credential without printing any secret. The shared capability calculation then returned Flux image, LTX video, and Tracks audio as configured. A fresh authenticated workspace reload completed successfully, indicating that the reported state must be differentiated from an earlier client cache or an error-state rendering path before changing provider readiness rules. No image, video, audio, transcription, browser, or model workload was started during this investigation.

After deploying the composer control repair, the first fresh authenticated workspace frame again showed the expected session-recovery shell. This state is intentionally distinct from an unavailable media capability and must settle before visual inspection of the Media panel. No task action, provider request, microphone recording, or transcription was started in that recovery frame.

Once the authenticated workspace settled, the repaired Media panel consistently rendered **Image generation — Ready · flux**, **Video generation — Ready · ltx**, and **Audio generation — Ready · tracks**. The LTX availability is therefore confirmed as ready after a fresh client state recovery. Microphone capture was deliberately not started during this presentation review because it would request access to the user’s physical microphone; the repaired control now offers a retry only after the user has explicitly allowed that browser permission.

## References

1. [Agnes AI API overview](https://agnes-ai.com/en/docs/overview)
2. [AIHubMix documentation overview](https://docs.aihubmix.com/en)
3. [AIHubMix public model catalog](https://aihubmix.com/models?tag=free)
4. [Hyperbrowser documentation](https://www.hyperbrowser.ai/)
5. [AIHubMix Image Generation API](https://docs.aihubmix.com/en/api/Image-Gen)
6. [AIHubMix Video Generation API](https://docs.aihubmix.com/en/api/Video-Gen)
7. [AIHubMix Text-to-Speech API](https://docs.aihubmix.com/en/api/TTS)
8. [Agnes 2.0 Flash documentation](https://wiki.agnes-ai.com/en/docs/agnes-20-flash)
9. [Agnes 2.5 Pro Alpha documentation](https://wiki.agnes-ai.com/en/docs/agnes-25-pro-alpha)
10. [Pixazo Tracks API documentation](https://www.pixazo.ai/models/tracks)
11. [Pixazo free API catalog](https://www.pixazo.ai/api/free)
