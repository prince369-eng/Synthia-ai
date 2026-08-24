# Synthia AI Remaining-Area Production-Readiness Audit

**Audit date:** 24 August 2026  
**Scope:** Repository implementation, runtime health, PostgreSQL schema readiness, deterministic tests, dependency advisory output, and configuration-gated product areas. This audit did not submit an agent task, call an LLM or media provider, access a user connector, or read user task content.

## Executive assessment

Synthia has a **working protected workspace and agent control plane**, rather than a feature-only interface. The verified baseline includes authenticated task creation, policy-gated worker execution, bounded error recovery, automatic text and vision planner routing, and quota-safe automatic media-route selection. The application server returned HTTP 200 locally, the latest managed-server log did not show an unhandled runtime error signature, and the current PostgreSQL migration ledger and required application tables are present.

The product is not yet safe to describe as fully production-ready for every advertised integration. Remaining work is primarily split across dependency remediation, deliberate production configuration, worker deployment, user-authorized external connections, and the intentionally non-executing Network Lab runner boundary.

> **Status convention:** “Implemented” means the source and deterministic tests provide the feature boundary. “Configuration-gated” means the product intentionally remains inactive until a user or operator supplies valid, authorized production configuration. “Blocked” means a specific dependency, deployment, or external service condition must be resolved first.

| Priority | Area | Current status | Verified boundary | Remaining action |
|---|---|---|---|---|
| P0 | Production dependency advisories | **Partially remediated; monitored** | The fixed `form-data` override is applied. The production audit retains one moderate ExcelJS/UUID advisory and two high PptxGenJS/image-size advisories. | Monitor ExcelJS for a compatible UUID upgrade; retain the verified spreadsheet boundary and prohibit untrusted image processing in PowerPoint export until an upstream-safe replacement or isolated guarded path is available. |
| P0 | Model/provider execution | **Configuration-gated** | Automatic planner fallback, malformed-response pause, and quota-safe media routing are implemented. | Maintain valid free-tier or paid provider routes, a running worker, Redis, and explicit usage limits. A failed route pauses safely rather than pretending success. |
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

## Recommended sequence

First, retain the fixed `form-data` lockfile resolution and the ExcelJS export/import contract while monitoring for an upstream-compatible UUID upgrade. Second, preserve the current no-image PowerPoint export boundary; if a future feature needs user-provided images, introduce strict type/size checks and an isolated execution boundary before dependency changes or image parsing. Third, conduct a real deployment readiness pass for OAuth redirects, worker supervision, Redis reliability, provider quotas, storage, and the integrations the operator actually intends to enable.

The Network Lab runner should remain after those application-level controls. It requires a separate Linux guest, operator-owned licensed images, signing keys, and explicit local approval; it is intentionally not an automatic web-service workload.
