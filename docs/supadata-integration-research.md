# Supadata Integration Research Record

## Official product page review — 2026-08-20

Source: <https://supadata.ai/>

The official product page describes Supadata as a web-media intelligence API that can retrieve transcripts, metadata, and structured analysis for public content from YouTube, TikTok, Instagram, X, and Facebook. The page’s published transcript example uses `GET https://api.supadata.ai/v1/transcript?url=<public-video-url>` with an `x-api-key` request header. Its response example contains a language field and timestamped transcript segments.

The page also advertises a separate analysis capability for producing structured JSON from a prompt or schema, as well as web scraping and crawling for arbitrary URLs. Synthia will not assume unreviewed endpoint paths or fields for those operations; they require confirmation from the official API documentation before implementation.

## Integration boundary for Synthia

Synthia will treat Supadata as an optional, server-only public-media URL understanding provider. The integration must use a `SUPADATA_API_KEY` secret, perform no provider request during routine tests, reject local/private/metadata destinations, validate a public social/video URL before calling the provider, preserve user ownership of generated task artifacts, and remain unavailable until the key is securely configured.

## Official documentation review — 2026-08-20

Source: <https://docs.supadata.ai/>

The official documentation confirms that all API requests use an `x-api-key` header, return JSON, and share the `https://api.supadata.ai/v1` base URL. It identifies the supported Synthia-relevant feature categories as video transcripts for YouTube, TikTok, Instagram, Facebook, X, and video files; social-media metadata; AI-assisted structured data extraction from supported-platform videos; and a web reader for website extraction, crawling, and structured data. The key is created in the Supadata dashboard and must be used only from a secure server environment.

The documentation also states that rate limits are plan-dependent. Therefore, the integration will set a Synthia user-scoped rate limit in addition to provider-side controls, and will keep all connectivity or live-provider tests opt-in.

## Transcript contract

Source: <https://docs.supadata.ai/get-transcript>

`GET /transcript` accepts a required public `url` query parameter, and optionally `lang`, `text`, `chunkSize`, and `mode`. The documented transcript modes are `native` (existing captions only), `generate` (provider AI transcription), and `auto` (native with an AI fallback). To avoid an unexpected provider-generation charge, Synthia’s first transcript route will request `mode=native` and will not retry in a generative mode without a separate, explicit user approval.

The endpoint can return a completed transcript synchronously with HTTP 200, or an HTTP 202 job identifier. The documentation recommends one-second polling and notes that completed job results expire after one hour. Synthia will cap polls and persist a normalized, bounded task-owned transcript result before the provider result expires. Only public, non-live, non-authenticated media is eligible.

## Structured video-analysis contract

Source: <https://docs.supadata.ai/get-extract>

`POST /extract` requires a public supported-video URL and at least one of a task prompt or JSON Schema. It always returns HTTP 202 with a job identifier, and its result endpoint transitions through `queued`, `active`, `completed`, or `failed`. The operation uses provider AI to analyse visual and audio content and is therefore an explicit user-started workload, not a background Automatic-routing probe. The Synthia adapter will limit prompt and schema sizes, cap polling, and surface provider failures as task events without leaking provider details or secrets.

## Exact extract job polling contract

Source: <https://docs.supadata.ai/get-extract#getting-job-results>

The documented creation response is `{ "jobId": "…" }`. Polling uses `GET https://api.supadata.ai/v1/extract/{jobId}` with the same `x-api-key` header. A completed response has `status: "completed"` and `data`; a failed response has `status: "failed"` and an error field. Other documented states are `queued` and `active`. The provider recommends a one-second poll interval; completed job results expire after one hour. Supadata’s documented extraction workload is charged by processed minutes, so Synthia must only start it after the user submits an explicitly understood task—not during intent classification, routine tests, or readiness checks.
