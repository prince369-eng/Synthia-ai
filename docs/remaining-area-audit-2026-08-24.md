# Synthia AI Remaining-Area Production-Readiness Audit

**Audit date:** 24 August 2026  
**Scope:** Repository implementation, runtime health, PostgreSQL schema readiness, deterministic tests, dependency advisory output, and configuration-gated product areas. One subsequent user-approved, bounded text-only provider validation was run without reading task content or accessing any connector, media, browser, sandbox, device, or Network Lab capability.

## Executive assessment

Synthia has a **working protected workspace and agent control plane**, rather than a feature-only interface. The verified baseline includes authenticated task creation, policy-gated worker execution, bounded error recovery, automatic text and vision planner routing, and quota-safe automatic media-route selection. The application server returned HTTP 200 locally, the latest managed-server log did not show an unhandled runtime error signature, and the current PostgreSQL migration ledger and required application tables are present.

The product is not yet safe to describe as fully production-ready for every advertised integration. Remaining work is primarily split across dependency remediation, deliberate production configuration, worker deployment, user-authorized external connections, and the intentionally non-executing Network Lab runner boundary.

> **Status convention:** “Implemented” means the source and deterministic tests provide the feature boundary. “Configuration-gated” means the product intentionally remains inactive until a user or operator supplies valid, authorized production configuration. “Blocked” means a specific dependency, deployment, or external service condition must be resolved first.

| Priority | Area | Current status | Verified boundary | Remaining action |
|---|---|---|---|---|
| P0 | Production dependency advisories and install policy | **Partially remediated; contained and monitored** | The fixed `form-data` override is applied. The production audit retains one moderate ExcelJS/UUID advisory and two high PptxGenJS/image-size advisories. Dependency lifecycle execution is now an explicit reviewed policy. | Monitor ExcelJS for a compatible UUID upgrade; retain the verified spreadsheet boundary and prohibit untrusted image processing in PowerPoint export until an upstream-safe replacement or isolated guarded path is available. Review every newly introduced dependency build script before altering the approved or ignored lists. |
| P0 | Model/provider execution | **Configuration-gated** | Automatic planner fallback, malformed-response pause, transport-failure pause, and quota-safe media routing are implemented. | Maintain valid free-tier or paid provider routes, a running worker, Redis, and explicit usage limits. A failed route pauses safely rather than pretending success. |
| P0 | Storage and external actions | **Configuration-gated** | Policies, approval states, and service boundaries exist. | Configure authorized storage and connector accounts before enabling write-capable tasks; retain user approval for consequential external actions. |
| P1 | Authentication | **Implemented, deployment-gated** | Protected procedures and Manus OAuth flow are present. | Confirm production redirect configuration and execute production user acceptance testing before go-live. |
| P1 | Voice and screen sharing | **Configuration-gated** | UI controls, protected dispatch, and safe unavailable states are present. | Supply valid LiveKit configuration and test only with a user’s explicit browser permission. |
| P1 | Schedules and background workers | **Deployment-gated** | Queue and schedule boundaries are implemented. | Deploy a separately supervised worker and deliberately configure schedule execution; preview mode must not be treated as a scheduler. |
| P1 | Connectors and plugins | **Configuration-gated** | Catalog and authorization-oriented interaction surfaces exist. | Connect each user-authorized application individually; catalog visibility never grants account access. |
| P1 | Network Lab control plane | **Implemented control plane** | PostgreSQL migration baseline is now applied; lab proposals, approvals, manifests, and evidence records persist. | Keep runner installation, vendor images, signing material, and Linux VirtualBox execution separate and explicitly approved. The deployed application still does not start devices or vendor workloads. |
| P2 | WorkOS alternative authentication | **Readiness-only** | Detection and disabled-state handling exist. | Complete tenant configuration and explicitly enable it after production OAuth decisions are finalized. |
| P2 | Historical tracker and documentation | **Needs consolidation** | Active implementation is documented and tested, but the historical tracker contains many stale unchecked entries. | Reconcile old entries into a smaller maintained roadmap. |

## Verified runtime and database baseline

The local service returned **HTTP 200** during this audit. The inspected recent development log tail did not contain an unhandled runtime error signature. The repository had no source change other than the requested tracker/audit documentation while the audit was running.

The metadata-only PostgreSQL inspector confirmed a present Drizzle ledger with **22 entries**, including the repaired Network Lab and media-attempt schema state. The runtime database contains the `media_generation_attempts`, Network Lab, task lifecycle, deliverable, policy, memory, schedule, and voice-session tables required by the current control plane. This confirms schema availability, not that a particular user’s task, connector, lab, voice session, or provider account is configured.

## Automatic routing status

Automatic selection has two deliberate layers. Text and vision planning rank compatible configured candidates and can switch before an agent action is performed when a route is unavailable, rate-limited, or produces unusable structured planning output. An explicit manual model choice remains authoritative.

Image, video, and audio selection persists compatible credential-gated candidates before a provider request. Media generation uses a durable request identity: a completed attempt reuses the resulting artifact, while an uncertain remote outcome is paused for reconciliation rather than retried through another provider. This prevents a timeout from silently producing duplicate generation charges or duplicate artifacts.

## Dependency remediation detail

The production dependency audit now finds three transitive advisories. The fixed `form-data` override has been applied through the affected lockfile paths, removing that advisory family. The remaining advisory paths are an ExcelJS-to-UUID dependency and two PptxGenJS-to-image-size findings.

The remaining advisories are inherited through `exceljs` (`uuid`) and `pptxgenjs` (`image-size`). The installed ExcelJS UUID call site uses UUID `v4`, while the reported UUID advisory affects `v3`, `v5`, and `v6` external-buffer operations; Synthia's spreadsheet export does not expose that API shape and now has a real export/import round-trip contract. The image-size advisory has no patched release identified by the audit output. It should not be “fixed” by a blind override: the current PowerPoint export has no image-byte input, and any future image-bearing export must introduce strict server-side type, byte, pixel, and bounded-decoding controls before enabling the parser path.

### Package-manager dependency-execution boundary

The repository pins `pnpm@10.4.1`, contains no project `.npmrc` or pnpm hook file, and defines no root `preinstall`, `install`, `postinstall`, or `prepare` script. A static scan of the installed lockfile-resolved manifests found eight install-hook declarations across six package names. The workspace now records a reviewed decision for every package name found by that scan: `@tailwindcss/oxide` and `esbuild` are the narrowly approved build-time dependencies, while `@google/genai`, `@livekit/local-inference`, `msgpackr-extract`, and `protobufjs` are explicitly denied. The latter group is either no-op/diagnostic at install time or optional for the verified local build and test path; it is not permitted to execute merely because it is transitively installed.

`strictDepBuilds: true` makes a future clean install fail rather than silently accepting a newly introduced, unreviewed dependency build script. pnpm 10 documents this setting as a non-zero install exit for unreviewed post-install scripts, and its approval workflow stores approved and unapproved dependencies in the workspace policy. [1] [2] This is intentionally **not** a blanket `ignore-scripts` setting: application lifecycle scripts remain unaffected, and a dependency requiring a new build script must be consciously reviewed, categorized, and validated before its policy entry changes.

The locked graph and policy were validated locally with `pnpm install --frozen-lockfile --ignore-scripts --offline`, so this review neither fetched packages nor executed lifecycle hooks. The complete deterministic suite then passed with 73 test files and 352 assertions, with seven configuration-gated suites and 16 assertions skipped; strict TypeScript and the production build also passed. The classic preview-script advisory is resolved: the source document no longer contains the classic tag, and the development transform injects the cache-busted fallback only when needed. The remaining build advisories are the two client bundles that exceed the default size-warning threshold.

## Implementation-marker classification

A scoped scan of application source, excluding tests and historical scan artifacts, found no active `TODO`, `FIXME`, `not implemented`, `coming soon`, or `stub` marker that represents an unfinished production feature. The remaining placeholder matches are standard input hints, such as field examples and accessible empty-state copy. The reviewed Office export menu invokes the authenticated task-bound export procedure and explicitly states that it does not start a model run. These are implemented control surfaces, not feature-only placeholders.

## Approved bounded provider validation

One explicitly approved text-only validation was created with web search, code execution, file writes, connectors, media, voice, browser, sandbox, and Network Lab capabilities disabled. It reached a provider transport failure and paused after that single attempt; no follow-up task cycle was queued and no prohibited action ran. The validation revealed that a non-provider transport exception on an explicit model candidate could reach the generic worker-retry path. The worker now classifies every explicit-candidate transport failure as an unavailable route before any agent action, and deterministic coverage verifies that it pauses safely rather than requeueing side effects. The previously stopped task remains untouched.

## Visual-audit availability

The managed screenshot endpoint did not expose a preview URL during this review. A temporary local preview was recovered and reached its authenticated workspace loading state; no composer submission, task mutation, provider call, or user action was performed. A complete layout audit remains dependent on the authenticated workspace resolving in the preview environment, so the outstanding visual-refinement tracker items remain open rather than being inferred from source inspection alone.

## Managed preview availability boundary

The local Synthia server restarted cleanly, listens on the expected port, and returns HTTP 200 locally. The managed preview service did not publish a preview URL after restart, and the temporary public proxy returned its own unavailable page despite the healthy local process. This indicates a preview-routing or sandbox gateway availability issue rather than an application startup, type-check, or local HTTP failure. The safe recovery is to restart the managed service and wait for its preview mapping to be reissued; no source change, task submission, provider request, or external agent action is required. If the mapping remains absent, the project can still be checked from the Management UI once its preview service recovers.

On a subsequent user-reported check, the managed screenshot service again reported no preview URL while the development server remained running and TypeScript remained clean. The user selected **deferred storage**, so artifact-store configuration and its live verification remain intentionally disabled until a storage provider is chosen.

## Client HTML and navigation boundary

A scoped client-source audit found one `innerHTML` use: the startup failure fallback renders a fixed literal message and does not interpolate task, provider, URL, or user-controlled data. No markdown-to-HTML renderer or dynamic HTML injection path was found. The only direct navigation helper validates the configured account-portal origin as public HTTPS without credentials, port, query, or fragment before it constructs the OAuth callback URL; it uses a fresh nonce and explicit user interaction. No client-side XSS or unsafe external-navigation correction was required by this review.

## Repository credential and build-artifact containment

The repository ignore policy covers dependency directories, build and coverage output, runtime logs, local databases, editor state, and untracked environment-configuration filename variants (`.env`, `.env.*`, and `.envrc`) without inspecting their contents. The production Vite output is isolated under ignored `dist/` output. The local development compatibility bundle remains available only through `build:preview`, which the development command invokes explicitly; the production `build` command no longer emits that large classic bundle, and the Vite production hook also removes any copied compatibility asset from the final bundle. The focused regression and production build verify that `dist/public/synthia-preview.js` is absent after a production build. This keeps the preview-only fallback out of deployment artifacts without changing the existing development fallback behavior.

## HTTP response-security boundary

The server already limits credentialed CORS to configured public origins or exact same-origin managed previews, with no wildcard origin path. The response policy now centralizes content security, framing, MIME-sniffing, referrer, and permissions headers in a deterministic contract and adds `Strict-Transport-Security: max-age=31536000; includeSubDomains` only for production deployment. Development and preview modes deliberately omit HSTS so local HTTP access is not pinned to HTTPS. The JSON and URL-encoded parsers retain their bounded 24 MB ceiling for the supported base64 voice path; malformed bodies now return only `INVALID_REQUEST_BODY` and oversized bodies only `PAYLOAD_TOO_LARGE`, rather than a framework-generated response. Focused header and parser tests, strict TypeScript, the complete deterministic suite, and the production build passed; the remaining large client-chunk build advisories stay visible.

## Authenticated mutation rate-limit boundary

Rate-limit buckets are keyed by the authenticated user identifier and a server-defined operation scope, not by forwarded client IP headers. This avoids proxy-header spoofing and prevents shared managed-preview egress addresses from grouping unrelated users. Task creation, Office export, attachment upload, voice operations, Network Lab controls, scheduled-work controls, and integration operations apply owner-scoped limits before expensive or external work. In production, missing Redis causes the protected mutation boundary to fail closed with a bounded precondition response; local development permits the absent dependency so deterministic tests remain runnable. The retained limitation is operational rather than application-level: production must provide healthy Redis before protected mutation traffic is enabled.

## Server error-disclosure boundary

The review found raw transport and provider-detail construction in two configuration-gated capability helpers. Heartbeat transport failures and non-success provider statuses now map to bounded, status-appropriate client messages without endpoint text, response bodies, or raw status detail. Voice-transcription results now return only a stable error message and error code; request, provider, and unexpected exception details are no longer included in the result payload. Deterministic regressions verify these payload contracts. The helpers remain configuration-gated and no Heartbeat or transcription request was started during this work.

## Recommended sequence

First, retain the fixed `form-data` lockfile resolution, the reviewed package-manager execution policy, and the ExcelJS export/import contract while monitoring for an upstream-compatible UUID upgrade. Second, preserve the current no-image PowerPoint export boundary; if a future feature needs user-provided images, introduce strict type/size checks and an isolated execution boundary before dependency changes or image parsing. Third, conduct a real deployment readiness pass for OAuth redirects, worker supervision, Redis reliability, provider quotas, storage, and the integrations the operator actually intends to enable.

The Network Lab runner should remain after those application-level controls. It requires a separate Linux guest, operator-owned licensed images, signing keys, and explicit local approval; it is intentionally not an automatic web-service workload.

## References

[1]: https://pnpm.io/10.x/settings#strictdepbuilds "pnpm 10.x Settings — strictDepBuilds"
[2]: https://pnpm.io/10.x/cli/approve-builds "pnpm 10.x approve-builds"
