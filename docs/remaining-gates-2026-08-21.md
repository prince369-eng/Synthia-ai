# Remaining Go-Live Gates

**Status date:** 2026-08-21  
**Scope:** This record separates completed source- and test-verified product work from actions that must remain deferred until a user supplies credentials, publishes the application, or explicitly confirms a GitHub push. It does not authorize any provider workload.

## Classification

| Area | Current product boundary | Required next input or action | Why it remains deferred |
|---|---|---|---|
| AI, vision, and media providers | Provider catalog, guarded readiness, automatic routing, and explicit task-start boundaries are implemented. | Live endpoint verification only after the relevant provider credential, model availability, storage path, and quota approval are confirmed. | Live inference, image, video, audio, and transcription calls can consume quota and create chargeable artifacts. |
| E2B sandbox | E2B is intentionally disabled; HopX is the independently configured alternative boundary. | An E2B key and one template identifier after the account is billing-enabled. | The user stated that E2B is unavailable before a credit card is provided. |
| Durable artifact storage | The product retains provider- and storage-gated artifact delivery boundaries. | Either Cloudflare R2 or AWS S3 must be selected, then endpoint, region, bucket, access key, and secret key supplied securely. | Durable artifact output cannot be truthfully tested or enabled without a real storage account and credentials. |
| Deployment-gated scheduling | Scheduled Workflow persistence and deployment guards are implemented. | Publish the checked application, then conduct user-approved live Heartbeat lifecycle tests. | Development must not create live schedules or callbacks. |
| GitHub | GitHub-ready checkpoints exist. | Explicit user confirmation after all desired go-live checks are complete. | The user required the GitHub push to be the final confirmed action. |

## Validation Boundary

The current project validation remains intentionally non-billable. Deterministic tests, TypeScript checks, and builds are permitted. Provider inference, media generation, browser automation against external services, sandbox launches, object-storage writes, schedule creation, deployment, and source-code push remain opt-in, credential-gated, or confirmation-gated.

> **Operational rule:** A readiness label never substitutes for a live external verification. Synthia should initiate a guarded provider or deployment operation only after the appropriate user-controlled action and configured secret are present.

## Next Feasible Sequence

Once the user is ready, the secure sequence is to choose a durable artifact store, supply its credentials through managed secrets, run only a non-destructive storage verification, publish, complete user-approved live schedule verification, and then request explicit confirmation before pushing the repository to GitHub. E2B setup remains a separate optional path after its account prerequisite is met.
