# Synthia AI: Current Capability Status and Next Differentiators

**Status date:** 2026-08-21  
**Scope:** Source-audited product status. “Implemented” means the control plane, persistence, authorization, and user interface exist. It does not imply an external provider is live without its configured secret and a user-initiated verification.

## Current capability status

| Capability | Current status | What a user can do now | What remains before broad production use |
| --- | --- | --- | --- |
| Task workspace, event replay, approvals, projects, Library, settings, and skills | **Implemented** | Create and manage task context, inspect durable events, review approvals, navigate owned project surfaces, and use reviewed Skills. | Connect the desired task provider and validate a real end-to-end task under the user’s quota policy. |
| Governed operations | **Implemented** | Record pipeline health, propose bounded remediation, and record specialist delegation. | No automatic repair is permitted; every proposal still requires explicit user approval. |
| Proof-carrying tasks | **Implemented** | Record claims, reference metadata, verification state, confidence, and recovery guidance. | Reviewers must add evidence deliberately; Synthia does not invent or automatically fetch proof. |
| PDF, presentation, and spreadsheet exports | **Implemented, storage-gated** | From a task workspace, request a user-owned PDF, PPTX, or XLSX summary export. | Configure approved object storage and complete one user-started export verification. |
| Excel data work | **Implemented for XLSX outputs** | Produce an owned XLSX deliverable from an existing task. | Complex source-file editing continues to require an uploaded/owned file and a controlled task workflow. |
| Google Sheets data entry | **Connector-gated** | No external sheet is written automatically. | Connect a Google Workspace account, restrict scopes and target spreadsheet ownership, then add an explicit preview-and-approve writeback flow. |
| Reviewed task learning | **Implemented, review-gated** | Review a bounded lesson from a completed task and activate it for future planning. | It never edits model weights, code, tool permissions, providers, or another user’s memory. |
| Live voice and local screen sharing | **Implemented, hosting-gated** | The dashboard and task workspace expose consent-first controls and safe inactive states. | Keep disabled on Autoscale; an always-on worker and explicit activation flags are required before a realtime room can connect. |
| Browser research and computer execution | **Implemented, provider-gated** | View the task-facing controls and safe provider-readiness states. | Configure the chosen browser/sandbox provider and allowed-host policy, then run a user-approved read-only task. |
| Image, video, and audio workflows | **Implemented, provider-gated** | Select through automatic task routing only after a user starts a task. | Configure provider allowlists and complete small, quota-aware test tasks. |
| Scheduled workflows | **Implemented, deployment-gated** | Configure owned schedule definitions through the guarded UI. | Publish the application and run one reversible schedule through the authenticated deployment callback. |

## Safe definition of improvement

Synthia does **not** claim autonomous self-modification. A reliable product should improve task outcomes without silently changing its own security posture or surprising the owner. The implemented feedback loop is therefore:

1. A task result or failure produces a **pending lesson** with bounded text and task ownership.
2. The owner reviews it in the task workspace.
3. Only an explicitly approved lesson is added to the existing bounded personalization context for a later task.
4. Every action remains traceable through the task event stream and can be superseded by future approved guidance.

This design supports learning from mistakes while preserving authorization, auditability, and an operator’s ability to reject a bad conclusion.

## Recommended differentiators to implement next

| Priority | Differentiator | Why it is useful | Safe delivery boundary |
| --- | --- | --- | --- |
| 1 | **Evaluation packs** | Let users define success criteria, checklists, and counterexamples per task type, then compare outcomes across runs. | Store owner-scoped evaluation specifications and results; never auto-promote a lesson without review. |
| 2 | **Preview-and-approve Google Sheets writeback** | Converts XLSX analysis into controlled business operations without silently modifying shared records. | OAuth scopes limited to selected sheets; show a row-level diff; execute only after approval. |
| 3 | **Artifact provenance bundle** | Attach source references, transformation steps, hashes, and reviewer sign-off to PDF/PPTX/XLSX exports. | Reuse proof records and deliverables; do not claim source verification that has not occurred. |
| 4 | **Replayable run comparison** | Compare plans, costs, tool actions, evidence, and outcomes across two owner-approved task attempts. | Read-only analytics over already owned task events and artifacts. |
| 5 | **Policy-aware specialist handoffs** | Use the current delegation records to enforce role-specific budgets, data access, and review gates. | Propose only; do not execute a delegated agent without explicit task approval. |

> The next most valuable step is the **preview-and-approve Google Sheets writeback** flow. It has immediate business value, builds on the new XLSX export foundation, and can remain fully auditable and user-controlled.
