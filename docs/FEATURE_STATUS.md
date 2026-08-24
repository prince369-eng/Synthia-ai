# Synthia Feature Status

This document is the operational truth source. A feature can be present in the interface while still being **configuration-gated** or **intentionally disabled**. Do not treat a visible button as proof that an external action will occur.

| Area | Current stage | What works now | What is required before real-world use |
|---|---|---|---|
| Authentication | Implemented | Manus OAuth route and protected user-scoped procedures. | Valid production OAuth configuration and verified redirect settings. |
| Workspace and task UI | Implemented | Task dashboard, workspace, replay view, projects, library, settings, docs, responsive navigation, and bounded error states. | Normal user acceptance testing. |
| Task orchestration | Implemented control plane | Typed task lifecycle, event model, policy gates, worker boundaries, automatic text/vision planning selection, and explicit manual-model override. | Enable only the providers and execution resources you intend to use. Unavailable, malformed, or transport-failed planning routes pause safely before agent actions rather than requeueing side effects. |
| Provider catalog | Configuration-gated | UI and server integration boundaries for supported providers, with compatible configured candidates ranked only when the user selects Automatic. | Valid provider credentials, account entitlements, model selection, and deliberate quota testing. Manual selection remains authoritative. |
| Search and research | Configuration-gated | Search-provider integration paths and task policies. | Valid API credentials and explicit usage controls. |
| Connectors and plugins | Configuration-gated | Connector catalog and authorization-oriented UI. | User-authorized connector account; no implied access to every listed application. |
| Voice and screen sharing | Configuration-gated | Voice-mode UI, protected dispatch logic, safe failure states, browser controls. | LiveKit setup, browser permission, and user action. |
| Image, video, audio, and transcription | Configuration-gated | Input validation, credential-gated provider candidates, durable media-attempt records, and preflight-only media fallback boundaries. | Supported model account, key, permitted quota, and explicit request. A completed artifact is reused; an uncertain remote outcome pauses for reconciliation rather than being retried through another provider. |
| Scheduled workflows | Deployment-gated | Scheduling interface and protected workflow model. | Published deployment and deliberate schedule configuration. Preview does not create jobs. |
| WorkOS alternative sign-in | Readiness-only | Configuration detection and safe disabled state. | Full WorkOS tenant configuration and explicit enablement. |
| Network Lab Workspace | Implemented control plane | Owner-scoped proposals, topology data, configuration candidates, validation plans, approval states, short-lived manifests, and bounded evidence intake. The reviewed PostgreSQL schema baseline is applied. | Configure the separate runner prerequisites before relying on local execution. |
| Linux VirtualBox runner | Planned / not installed | Runner contract and local-safety design only. | Asymmetric signing key, reviewed runner package, Linux host preparation, licensed images, nested virtualization where applicable, and explicit operator confirmation. |
| Production network access | Intentionally disabled | No production device execution path. | A separate governance, identity, audit, and production-write design; not in current scope. |

## Network Lab truth statement

The existing Network Lab Workspace is **not** a network emulator and does not start machines. It creates reviewable lab intent and a signed control-plane artifact after approval. No device credentials, vendor images, VirtualBox commands, or production-network reachability are stored or started by the deployed web application.

## Current limitations requiring action

The Network Lab schema baseline is applied to the configured PostgreSQL runtime. The initial private signing key has not been supplied and the runner is not installed on the Linux guest. Therefore a downloaded manifest should be treated as a control-plane artifact, not an executable lab run.
