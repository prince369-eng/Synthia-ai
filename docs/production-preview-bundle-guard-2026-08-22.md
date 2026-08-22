# Production Preview-Bundle Guard

**Date:** 2026-08-22  
**Scope:** Preventing a development-preview compatibility artifact from being requested by the production client.

## Finding

The source HTML intentionally includes two client entry paths: the normal ES-module application entry and a classic `synthia-preview.js` compatibility entry for managed development previews. The compatibility artifact is generated as a single approximately **3.5 MB** IIFE bundle, which cannot preserve route-level dynamic imports.

Before this change, the production build retained the classic-script reference in its output HTML. A production browser could therefore request both the normal code-split module graph and the large preview compatibility artifact, undermining the recent lazy-loading work.

## Implemented Boundary

Vite now applies the `synthia-production-preview-guard` only when its resolved configuration identifies a production build. The guard removes the classic preview-script tag from production HTML while leaving the source entry and development-preview behavior intact. It uses Vite’s resolved command and mode rather than an ambient process variable, because the build environment did not reliably expose `NODE_ENV` to the original guard condition.

| Environment | Normal module entry | Classic preview compatibility entry |
|---|---|---|
| Managed development preview | Remains available. | Remains available from the source HTML. |
| Production build | Remains available. | Omitted from the built HTML; no production browser request is created. |

The build still generates `synthia-preview.js` as a development artifact. It is not linked by production HTML and is therefore not part of the production page’s request graph. No task, provider, authentication, permission, or external-integration behavior changed.

## Regression Coverage and Validation

`server/bundleHardening.test.ts` protects the source/build boundary by asserting that the source retains the compatibility tag, while the Vite configuration contains a production-only resolved-mode guard and removal rule. The production build was additionally checked directly: `dist/public/index.html` contains no `synthia-preview.js` reference.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused bundle-hardening regression | Passed. |
| `pnpm build` | Passed; production HTML omits the classic preview-bundle reference. |
| `pnpm test` | Passed: 44 test files and 207 assertions; 16 opt-in tests intentionally skipped. |

The remaining Vite advisory for the primary application chunk is preserved as a visible optimization follow-up. It is unrelated to the removed classic preview request and has not been suppressed.
