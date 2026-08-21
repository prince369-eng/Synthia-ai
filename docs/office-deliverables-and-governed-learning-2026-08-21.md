# Office Deliverables and Governed Task Learning

**Status:** Implemented foundations, with storage and connector boundaries described below.  
**Scope:** User-owned task exports, review-gated lessons, and future-task planning context.  
**Date:** 2026-08-21

## What Synthia can do now

Within an existing task workspace, the new **Export** control creates a user-requested, task-owned Office deliverable. The export generator uses the task’s actual title, goal, lifecycle timestamps, and durable event trail; it does not call a model, a browser agent, a sandbox, or an external provider merely to render the file. The output is stored through the existing task-artifact boundary and appears in the task’s Files area when configured storage is available.

| User action | Output | Current behavior | Safety boundary |
| --- | --- | --- | --- |
| Select **Export audited PDF brief** | PDF | Creates a readable task brief with task metadata and the recorded event timeline. | Owner-only task lookup; server-side input validation; task event audit. |
| Select **Export editable presentation** | PPTX | Creates an editable presentation summarizing the task goal and execution history. | Owner-only task lookup; no provider call; no synthetic reviews or claims. |
| Select **Export task timeline spreadsheet** | XLSX | Creates an editable spreadsheet of the actual task timeline and event payload summary. | Owner-only task lookup; no external sheet is modified. |
| Select **Review** and propose a lesson | Pending lesson | Stores a bounded, task-linked learning candidate. | It remains pending and cannot affect another task. |
| Select **Approve for future tasks** | Approved planning context | Adds up to two approved, short lessons to the bounded long-term planning context for future tasks. | User approval is required; lessons are treated as untrusted context, not executable instructions. |

> **No self-modifying agent is enabled.** A lesson cannot alter source code, tools, model allowlists, credentials, permissions, system instructions, or a previously running task. The task runner does not create memories automatically. It can use only user-approved, bounded lessons while planning a later task.

## What requires configuration or a user approval

The office export procedures are implemented and tested. They require the same artifact-storage configuration used by other task deliverables before the generated files can be retained and downloaded. If storage is not configured, the export fails cleanly with a precondition error and no partial deliverable record is created.

Google Sheets writeback is intentionally **not** enabled. The current environment does not have a Google Workspace connector. Synthia can generate an XLSX file for upload, but it must not modify a Google Sheet until the user connects an authorized Google account and approves a specific spreadsheet, worksheet, column mapping, and write scope. This prevents a model or task from changing business data merely because it inferred that a spreadsheet should be updated.

| Capability | Status | Remaining requirement |
| --- | --- | --- |
| PDF, PPTX, and XLSX task exports | **Implemented, storage-gated** | Configure the user-owned artifact storage path, then use Export inside a task. |
| Excel file data entry | **Implemented as user-owned XLSX export** | The user downloads the generated workbook and may edit or upload it. A later controlled import/writeback workflow can be added with an explicit schema. |
| Google Sheets read/write | **Not enabled** | Connect Google Workspace and implement a connector-scoped, sheet-specific approval workflow. |
| Learning from task outcomes | **Implemented, review-gated** | Propose and explicitly approve lessons in the task’s Review tab. |
| Automatic self-modifying improvement | **Intentionally unavailable** | Not compatible with the product’s approval, audit, and permission boundaries. |

## Recommended next unique capabilities

The most differentiated, safe next step is a **proof-linked task quality ledger**: a user can compare a deliverable against its proofs, evaluator feedback, approved lessons, and recovery actions before reuse. Synthia already has proof records, governed operations, and reviewed lessons; a unified quality ledger would make improvement inspectable rather than opaque.

A second priority is **connector-scoped spreadsheet operations**. Rather than general “data entry,” it should offer a preview of the exact rows and cells to change, a reversible write batch, cell-level evidence, and explicit approval for each external spreadsheet target. This makes a capable agent useful for operations work without turning it into an unbounded editor.

Finally, Synthia can extend its reviewed-learning model with **task playbooks**. A user-approved lesson set could be promoted into a versioned, reviewable playbook with a defined purpose, scope, expiry, and rollback. This would allow recurring workflows to improve over time while keeping each improvement visible and reversible.
