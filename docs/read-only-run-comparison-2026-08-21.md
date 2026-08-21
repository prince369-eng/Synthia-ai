# Read-Only Run Comparison and Drift Dashboard

## Purpose

Synthia’s **Run comparison** workspace panel helps a task owner contrast durable, task-scoped records with one selected prior task. It is a review surface, not an evaluator, executor, or optimization loop. The panel presents recorded facts so the owner can decide whether a difference deserves investigation.

## Records and Measures

| Measure | Persisted source | Interpretation boundary |
|---|---|---|
| Execution profile | Task routing settings | Context only; it is not a provider recommendation. |
| Credits and elapsed time | Task lifecycle fields | Recorded operational signals, not an estimate of model quality. |
| Deliverables | Task artifact metadata | Counts only; file bytes are never read by comparison. |
| Proof coverage | Owner-scoped proof records | A lower corroborated share prompts review; it never creates evidence. |
| Evaluation result | Owner-scoped reviewer results | The latest stored verdict is displayed; it never changes a lesson or prompt. |
| Errors and pipeline drift | Task event and health-signal records | Differences identify a review target; remediation remains separately approval-gated. |

## Safety and Authorization

The comparison query is protected and verifies ownership for both the current task and any selected baseline. It returns only user-owned task metadata and related durable records. The interface starts with the most recent completed owner task when one exists; when none exists, it shows an explicit empty state instead of inventing a baseline.

> The dashboard is **read-only**. It does not rerun tasks, invoke a model or tool, create a proof record, approve a proposal, modify Skills, change providers, revise prompts, mutate policies, or write a reviewed lesson.

## Review Workflow

An owner can open **Agent’s Computer → Compare**, select a previously owned task, and inspect the side-by-side metrics and any thresholded signals. A signal is a prompt for human review, not a diagnosis. Follow-up work remains a separately created task, and existing approval, proof, evaluation, remediation, and delegation controls continue to govern their respective actions.

## Thresholds

The implementation flags directional review signals for a changed execution profile; credits or elapsed time differing by at least 25%; corroborated-proof coverage lower by at least 20 percentage points; a lower reviewer verdict; more error events; or more pipeline-drift signals. Thresholds are intentionally transparent and conservative. They do not constitute an automated quality score or a reliability guarantee.
