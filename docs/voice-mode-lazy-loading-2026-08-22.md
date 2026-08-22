# Voice Mode Lazy Loading

**Date:** 2026-08-22  
**Scope:** Client bundle isolation for the disabled-by-default Voice Mode and local screen-share interface.

## Purpose

The LiveKit browser client is now isolated behind a dynamic import. Synthia loads that code only after a user explicitly opens the task-scoped Voice Mode dialog. The task workspace remains responsible for rendering the user-started entry points, but it no longer statically imports the realtime client implementation.

> Opening a dialog loads local interface code only. It does **not** request microphone permission, request screen-share permission, create a LiveKit room, start a task, or contact an external realtime service.

## Bundle Boundary

| Surface | Load behavior before this change | Load behavior now |
|---|---|---|
| Task workspace | Included Voice Mode state, realtime client code, and screen-share control logic in the workspace route chunk. | Contains the compact task workspace and a guarded lazy boundary. |
| Voice Mode dialog | Loaded whenever the task workspace route was downloaded. | Loads only when the user opens Voice Mode. |
| Microphone and screen sharing | Remained opt-in, but client implementation bytes arrived with the workspace. | Remain opt-in; implementation bytes and browser-permission code are deferred until the dialog is opened. |

The production build now emits a dedicated `VoiceModeDialog` chunk of approximately **550 kB** minified. The task-workspace chunk falls from approximately **804 kB** before extraction to approximately **258 kB** afterward. The existing primary-client chunk advisory remains and is intentionally documented rather than hidden; it is a separate optimization concern that does not alter Voice Mode safety semantics.

## Safety and Accessibility

The lazy boundary displays an accessible modal loading state while the dialog module resolves. It clearly says that no microphone or screen-share permission has been requested. Once loaded, the dialog retains its existing task ownership checks, disabled-until-configured behavior, explicit Start voice button, native local `getDisplayMedia` chooser, screen-track cleanup, finalized-transcript handling, and privacy reminder.

The change does not enable the realtime worker, change Reserved-hosting requirements, activate LiveKit credentials, start a voice session, or weaken the existing task-level approval and ownership controls.

## Regression Coverage and Validation

`server/uiLayout.test.ts` now verifies that the workspace uses a dynamic Voice Mode import, retains the user-started controls, does not statically import `livekit-client`, and keeps the implementation’s dialog semantics, local screen-share constraints, transcript handling, and privacy copy in the deferred module.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused `server/uiLayout.test.ts` | Passed. |
| `pnpm test` | Passed: 43 test files and 206 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. The existing primary chunk-size advisory remains visible. |

No task, model, media, microphone, screen sharing, browser agent, sandbox, storage, connector authorization, scheduled workflow, or external provider workload was started while implementing or validating this client-only optimization.
