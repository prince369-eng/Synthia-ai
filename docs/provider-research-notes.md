# Multimodal Provider Research Notes

The following official provider documentation was consulted during the Synthia AI multimodal audit on 2026-08-19.

| Capability | Provider reference | Relevant finding |
|---|---|---|
| Image generation | [OpenAI image generation API announcement](https://openai.com/index/image-generation-api/) | OpenAI documents the `gpt-image-1` Images API model for image generation and editing. Synthia must not mark an OpenAI image route ready until a provider adapter, storage path, and credential are configured. |
| Video generation | [Google Gemini API video generation](https://ai.google.dev/gemini-api/docs/video) | Google documents Gemini Omni Flash and Veo for video generation, including text/image/video workflows and Veo native audio. Synthia must not mark video generation ready until a selected provider adapter, asynchronous job/status handling, storage, and credential are configured. |
| Multimodal model catalog | [Google Gemini API documentation](https://ai.google.dev/gemini-api/docs) | Google documents multimodal understanding, image generation, video generation, and voice capabilities. The Synthia catalog should expose only configured model IDs and should keep unsupported media capabilities explicitly unavailable. |

These sources are reference material only. They do not authorize adding credentials, claiming provider readiness, or fabricating generated media. Provider-specific secret values remain outside source control and must be added through secure project configuration.

## Implementation boundary

Synthia currently has a real internal image-generation helper backed by the built-in ImageService and a real authenticated voice-transcription route. The current task composer supports image attachments routed through configured vision-capable LLMs. A video-generation adapter is not yet present; its UI state must therefore remain unavailable until the user selects a provider and the adapter contract is implemented and verified.
