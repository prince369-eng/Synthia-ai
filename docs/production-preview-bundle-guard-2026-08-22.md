# Production Preview-Bundle Guard

**Date:** 2026-08-22  
**Scope:** Preventing a development-preview compatibility artifact from being requested by the production client.

## Finding

The source HTML contains the normal ES-module application entry. For managed development previews, the Vite transform injects a classic `synthia-preview.js` compatibility entry only in development mode. The compatibility artifact is generated as a single approximately **3.5 MB** IIFE bundle, which cannot preserve route-level dynamic imports.

Before this change, the production build retained the classic-script reference in its output HTML. A production browser could therefore request both the normal code-split module graph and the large preview compatibility artifact, undermining the recent lazy-loading work.

## Implemented Boundary

Vite applies the `synthia-production-preview-guard` only when its resolved configuration identifies a production build. Production transforms preserve the source HTML without a classic preview-script tag, while development transforms inject the cache-busted compatibility tag. The production build command does not emit the classic IIFE, and the guard defensively removes any copied compatibility asset from the final bundle. It uses Vite’s resolved command and mode rather than an ambient process variable, because the build environment did not reliably expose `NODE_ENV` to the original guard condition.

| Environment | Normal module entry | Classic preview compatibility entry |
|---|---|---|
| Managed development preview | Remains available. | Injected by the development transform with a cache-busting revision. |
| Production build | Remains available. | Not emitted or linked; no production browser request is created. |

The explicit `build:preview` command generates `synthia-preview.js` as a development artifact. The production build does not emit it, so it is not part of the production page’s request graph. No task, provider, authentication, permission, or external-integration behavior changed.

## Regression Coverage and Validation

`server/bundleHardening.test.ts` protects the source/build boundary by asserting that the source has no static compatibility tag, while the Vite configuration contains a development-only injection path and production artifact removal rule. The production build was additionally checked directly: `dist/public/index.html` contains no `synthia-preview.js` reference and `dist/public/synthia-preview.js` is absent.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused bundle-hardening regression | Passed. |
| `pnpm build` | Passed; production HTML omits the classic preview-bundle reference. |
| `pnpm test` | Passed: 44 test files and 207 assertions; 16 opt-in tests intentionally skipped. |

The remaining Vite advisory for the primary application chunk is preserved as a visible optimization follow-up. It is unrelated to the removed classic preview request and has not been suppressed.
