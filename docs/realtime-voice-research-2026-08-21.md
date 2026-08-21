# Real-time Voice Mode Research Notes

## Official findings recorded before implementation

LiveKit’s official Agents documentation describes an agent as a stateful, real-time participant in a room. It uses WebRTC between the browser and the agent for resilient full-duplex media, while the agent-side integration communicates with backend services over HTTP and persistent WebSocket connections. The framework supports voice, video, text, turn detection, interruption handling, and provider plugins. Synthia should therefore keep browser media transport and model-provider credentials separate, with all provider credentials held server-side.

MDN documents that `navigator.mediaDevices.getDisplayMedia()` prompts the user to choose a display surface and grant capture access. It requires a transient user activation, the browser cannot persist permission for reuse, and it must be treated as a privacy-sensitive capability. Synthia’s screen-share action must consequently remain a visible, explicit user interaction; it must not auto-start, silently retry, or retain frames by default.

LiveKit documents that a browser screen share is published as a video track, and its browser API opens the native source picker when sharing is enabled. The Voice Mode client can therefore retain a local `MediaStream` preview while handing the same track to a configured LiveKit room only after the user has deliberately joined a live session. Optional tab audio remains a separate browser-dependent choice and will not be enabled by default.

Google documents Gemini Live as a preview, bidirectional WebSocket service for audio, image, and text input with audio output. It supports model input images at no more than one frame per second and explicitly supports server-to-server and client-to-server connection patterns. Synthia will use this only behind a server-owned provider adapter, with credentials or ephemeral session tokens kept out of browser source. Its one-frame-per-second limit is aligned with the requested low-rate screen-context sampling, not full-frame-rate model video ingestion.

The current LiveKit Node quickstart confirms that the supported SDK runs on Node.js 20 or newer and can use either a chained streaming STT–LLM–TTS pipeline or a direct speech-to-speech realtime model. LiveKit’s agent server registers as a long-lived process, receives a dispatch for each room, and starts an isolated job that joins the room as the AI participant. Synthia will keep that agent worker separate from its existing autoscaled web process and start it only after the operator configures the realtime transport credentials and switches the deployment to an always-on runtime. The web application remains responsible for authenticated, task-scoped room-token issuance, session auditing, and the consent-first user interface.

LiveKit’s current Node integration documentation includes a Google Gemini realtime plugin that supports Gemini Live’s two-way audio and video input path. This makes Synthia’s existing server-only `GEMINI_API_KEY` the preferred model credential for the initial direct speech-to-speech agent worker. The browser receives only a short-lived LiveKit room token; it never receives the Gemini credential, an agent dispatch credential, or a stored screen frame.

| Design area | Decision | Rationale |
| --- | --- | --- |
| Browser media transport | WebRTC through a LiveKit-compatible client boundary | Supports real-time, full-duplex audio and screen-share tracks without exposing model credentials in the browser. |
| User-screen capture | `getDisplayMedia()` initiated only from the Voice Mode overlay | Browser-enforced consent and source choice are mandatory for each capture request. |
| User screen retention | No automatic persistence | Captured local-screen frames are sensitive, live context only unless the user explicitly saves a frame. |
| Conversation source of truth | Existing task and event stream | Voice turns and sharing lifecycle events enrich the current task thread rather than forming a separate history. |
| Screen-track behavior | Local preview plus configured room publication only after deliberate session start | A screen share is a browser-selected video track; optional tab audio stays off by default. |
| Model-side bridge | Server-owned realtime provider adapter with a Gemini Live-compatible implementation path | Supports bidirectional audio, low-rate image context, and keeps long-lived provider credentials out of the client. |
| Initial direct-speech provider | Gemini Live through the LiveKit Node Google plugin | Uses the existing server-only Gemini credential and accepts low-rate screen video as live context. |
| Agent execution | Dedicated, always-on LiveKit Agents Node worker | LiveKit dispatches a separate room job per session; this does not belong in a request handler or autoscaled web process. |
| Current deployment state | UI and protected persistence can be built now; active media transport remains configuration- and deployment-gated | Avoids invoking a media, vision, speech, or model provider during development. |

## References

[1] [LiveKit Agents documentation](https://docs.livekit.io/agents/)

[2] [MDN: `MediaDevices.getDisplayMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)

[3] [LiveKit: Screen sharing](https://docs.livekit.io/transport/media/screenshare/)

[4] [Google: Gemini Live API overview](https://ai.google.dev/gemini-api/docs/live-api)
