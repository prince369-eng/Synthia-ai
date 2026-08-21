# Realtime Voice Mode verification record — 2026-08-21

The Synthia desktop workspace was captured twice after the Voice Mode integration without opening the dialog, requesting microphone permission, invoking `getDisplayMedia()`, connecting to LiveKit, or calling a model provider. The initial full-page capture caught the normal short-lived workspace loading state immediately after a hot restart. A subsequent 1280 × 720 capture settled into the authenticated task dashboard, confirming the existing sidebar, compact composer, teal/cyan hierarchy, and empty-task state remain visually intact.

Voice Mode itself is covered by deterministic source and availability-gate tests rather than a browser media simulation. This is deliberate: the product may not request microphone or screen permission, establish a room, or consume any realtime provider quota without an explicit end-user action on a credentialed production deployment.

| Verification scope | Result | Evidence |
| --- | --- | --- |
| Existing authenticated workspace after frontend changes | Passed | Settled desktop capture shows the normal task dashboard and composer. |
| Voice Mode visibility and consent contract | Passed | `server/uiLayout.test.ts` asserts explicit dialog launch, accessible modal semantics, `getDisplayMedia()` use, persistent stop cleanup, and local sensitivity notice. |
| Deployment-safe realtime gate | Passed | `server/realtime/voiceMode.test.ts` validates the disabled, incomplete, and fully configured states without issuing a room token. |
| Live microphone, local screen capture, LiveKit room, and Gemini Live session | Not run by design | Each requires explicit end-user consent plus configuration and an always-on worker. |
