# Website Preview Iframe Hardening

**Date:** 2026-08-22  
**Scope:** Task-owned HTML website previews rendered in the Agent’s Computer workspace.

## Finding

The website-preview panel already used a sandboxed iframe and an owner-scoped artifact URL. Its sandbox nevertheless enabled forms, modals, and popups in addition to scripts. Those capabilities are not needed for Synthia’s embedded preview and could let generated HTML create disruptive or misleading interaction flows within the product workspace.

## Implemented Boundary

The preview now uses a script-only sandbox and `referrerPolicy="no-referrer"`. Scripts remain available because interactive site previews can require client-side behavior. Forms, modal dialogs, popups, top-level navigation privileges, downloads, same-origin access, and referrer disclosure are not granted inside the embedded preview.

| Preview capability | Result |
|---|---|
| Task artifact selection | Remains task-owned and resolved through the protected artifact URL contract. |
| Script execution | Allowed inside the opaque sandboxed iframe for interactive rendering. |
| Forms, modals, and popups | Not allowed in the embedded preview. |
| Same-origin privileges | Not granted; `allow-same-origin` is absent. |
| Referrer disclosure | Suppressed for iframe subrequests. |
| User-initiated full view | Remains an explicit separate link with `noopener noreferrer`. |

> The embedded preview is intentionally restrictive. Users can choose the clearly labeled **Open website** link when a website needs functionality that should not run inside the application’s preview frame.

This change does not fetch artifacts during page render, alter task state, initiate a browser agent, or make external website actions autonomous.

## Validation

`server/uiLayout.test.ts` now requires the script-only sandbox and no-referrer policy and rejects the prior forms/modals/popups permission string. The existing regression continues to verify that only task-owned HTML deliverables enter the Website panel.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused workspace layout regression | Passed: 47 assertions. |
| `pnpm test` | Passed: 47 test files and 223 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing client bundle-size advisories remain visible and unrelated to iframe isolation. |

No task, model, media, website navigation, browser agent, sandbox, storage operation, connector authorization, scheduled workflow, or external provider workload was started during this hardening or validation.
