# Production Security and Completeness Audit

## Scope and outcome

This audit reviewed Synthia’s HTTP boundary, session lifecycle, protected procedures, owner-scoped task data, artifact access, task execution loop, approval gates, connector boundaries, scheduled workflow entrypoint, client placeholder markers, and production dependency tree. The review focused on verified execution paths rather than adding speculative features or initiating providers, browser agents, storage transfers, sandbox sessions, media generation, or scheduled runs.

The application already contained substantial guardrails: protected tRPC procedures, task-owner checks, explicit approval records for external effects, rate limits, CORS allowlisting, CSP and clickjacking protections, structured logging, replay read-only controls, and opt-in provider checks. The changes below closed concrete hardening gaps discovered during the review.

## Applied hardening

| Area | Completed control | Effect |
|---|---|---|
| Session lifecycle | The default application session lifetime is now **seven days**, rather than a long-lived default. Signed session verification continues to enforce expiry. | Limits exposure from an otherwise valid stolen session. |
| Preview authentication | Authorization-header fallback is restricted to managed preview and non-production contexts; production uses the HttpOnly session path. | Prevents a development compatibility mechanism from becoming a production bearer-session channel. |
| Artifact delivery | `/manus-storage/*` now authenticates the request, normalizes the key, verifies caller ownership, returns a non-enumerating `404` for inaccessible objects, and sends `Cache-Control: no-store` before issuing a signed redirect. | Replaces a public storage redirect with owner-checked artifact retrieval. |
| Request handling | JSON and URL-encoded request parsing are bounded to **24 MB**, which remains sufficient for the supported base64 voice-input contract. | Reduces request-body memory exhaustion risk without breaking supported input limits. |
| Automatic media routing | Automatic image, video, audio, and public-video routes create a durable approval request before any provider call can consume quota. Pending or rejected requests stop the cycle before generation. | Preserves the user’s quota-safety requirement; direct user-initiated media actions remain separately protected and rate-limited. |
| Scheduled workflows | The heartbeat-only workflow handler now writes detailed errors to structured logs and returns a stable generic failure code. | Avoids returning internal exception detail to a caller. |
| Dependency policy | Direct tRPC, AWS SDK, Axios, Express, Streamdown, Lodash, and Lodash ES dependency paths were upgraded. Active pnpm workspace policy now owns overrides and the required Wouter patch, avoiding deprecated package-level pnpm configuration. | Removes previously reported critical/high paths that had compatible upgrades. |

## Implementation completeness review

The source scan found no fabricated customer reviews, ratings, testimonials, seed datasets, or fake integrations. Most matches for “placeholder” are standard HTML input hints or examples in guarded review forms. The component showcase is a development/component-reference surface, not an application workflow.

The following visible unavailable capabilities are **truthful configuration gates**, rather than missing server or client implementations. They remain intentionally inactive until their external prerequisite exists.

| Capability | Current boundary | Reason it remains inactive |
|---|---|---|
| Google Sheets writeback | No Google Workspace authorization has been enabled. | Any write must wait for a connected user account and a later preview-and-approve flow. |
| Voice Mode | LiveKit credentials may be validated, but realtime flags and an always-on worker remain disabled. | Full-duplex sessions require Reserved hosting and an explicit production activation decision. |
| WorkOS sign-in | Readiness status only; Manus OAuth remains the active authentication route. | Authentication migration has not been explicitly approved. |
| Zapier app actions | Disabled without the required embedded connection configuration. | The UI correctly avoids presenting unavailable authorization as connected functionality. |
| E2B sandbox | Disabled. HopX is the configured alternate sandbox boundary. | E2B account activation has not been supplied. |

## Remaining dependency risk

The current production audit reports **two high advisories and one moderate advisory**. The prior SDK-owned `form-data@4.0.4` paths beneath the HopX and Hyperbrowser releases were removed by the reviewed fixed lockfile override. The remaining moderate ExcelJS-to-UUID advisory is constrained by the installed ExcelJS UUID `v4` call site and Synthia's real export/import compatibility contract; the advisory affects UUID `v3`, `v5`, and `v6` external-buffer operations. The two remaining high findings are `image-size@1.2.1` beneath the current PPTX export library, for which the audit identifies no patched release. The application does not expose a generic multipart-upload route; task attachment metadata is validated and storage access is owner-checked. PPTX export currently composes task-owned textual content rather than parsing user-provided images. These boundaries reduce exposure but do not eliminate supply-chain risk.

> **Deployment decision:** keep the residual ExcelJS and PPTX advisories visible and monitor their upstream release notes. Do not suppress the audit, force an incompatible UUID override, add an unguarded image-processing path, or claim the dependency tree is vulnerability-free.

## Validation

Focused security tests cover the bounded session value, storage-key traversal rejection, and automatic-media confirmation behavior. Strict TypeScript checking passed. The full deterministic suite passed with **202 tests across 42 files** and **16 intentional opt-in skips**. The production build passed; it retains only existing bundle-size advisories. No external workload was started during the audit.

## References

[1]: https://github.com/advisories/GHSA-hmw2-7cc7-3qxx "form-data CRLF injection advisory"
[2]: https://github.com/advisories/GHSA-w3rx-r6r6-pgpr "image-size ICNS parser denial-of-service advisory"
[3]: https://github.com/advisories/GHSA-5p2g-fcmc-qvqq "image-size JXL and HEIF parser denial-of-service advisory"
[4]: https://github.com/advisories/GHSA-w5hq-g745-h8pq "uuid external-buffer bounds advisory"
