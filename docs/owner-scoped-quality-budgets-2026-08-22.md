# Owner-Scoped Quality Budgets

**Date:** 2026-08-22  
**Scope:** Durable, owner-scoped quality-review expectations for a single Synthia task.

## Purpose and Boundary

Quality budgets let a task owner record the expectations that a human reviewer should use when assessing a task. A budget can declare bounded credit, runtime, and action-cycle facts; expected evidence, deliverables, and revision cycles; a review depth; reviewer guidance; and whether a human review record is required.

> **Quality budgets are review context, not execution controls.** They do not pause, cancel, retry, remediate, approve, pass, fail, score, queue, or otherwise mutate task execution.

The recorded ceilings are deliberately descriptive. Synthia does not claim that they are currently enforced runtime, cost, or action-cycle stop conditions. Implementing such enforcement would require a separate, bounded stop-condition design with explicit approval semantics and additional task-runner coverage.

| Aspect | Implemented behavior | Explicitly excluded behavior |
|---|---|---|
| Ownership | Every read and mutation is scoped to the authenticated task owner. | Cross-owner lookup or mutation. |
| Lifecycle | Owners can create, inspect, update, and archive budgets; historical events remain durable. | Deleting history or silently changing a recorded review fact. |
| Workspace | A dedicated **Quality** tab supports owner review; replay mode is read-only. | Starting a review, task, provider, model, browser, sandbox, queue, or connector action. |
| Evaluation | The **Evaluate** tab renders active-budget totals as informational review context. | Automatic evidence scoring, pass/fail, remediation, or task-state mutation. |
| Authority | Protected, rate-limited procedures require task ownership. | Changes to permissions, providers, approvals, task execution policy, or credentials. |

## Persistence and Audit Record

Migration `0017_bright_supernaut.sql` creates the `task_quality_budgets` relation, quality-budget lifecycle and review-depth enums, owner/task indexes, and the `quality_budget` task-event type. The configured PostgreSQL migration runner applied this migration through `pnpm db:migrate`.

The application writes durable task events for quality-budget updates and archival actions with the explicit marker `execution: "review_context_only"`. This marker is a boundary statement: the event documents a review-context change and does not authorize task execution or operational side effects.

## Workspace Behavior

The **Quality** workspace tab is the canonical place to create and manage task-owned budgets. It shows the declared facts and reviewer guidance, surfaces an empty state instead of inventing thresholds, and limits mutation controls to a live task owned by the current user. In replay mode, the panel renders records without edit, create, or archive actions.

The **Evaluate** workspace adds a compact summary of active budgets, including the declared totals for expected evidence records and deliverables. The summary is visibly labeled **Informational** and repeats that it cannot score evidence, issue a verdict, pause or retry work, or mutate the task. Evaluation results remain owner-recorded reviewer outcomes under the existing evaluation-pack contract.

## Safety Controls

| Control | Protection provided |
|---|---|
| Authenticated procedure boundary | Quality-budget APIs use protected procedures and task ownership checks. |
| Input validation and rate limits | Create, update, and archive inputs are bounded before persistence. |
| Status-gated lifecycle | Only active records can be edited or archived, preserving an inspectable archive. |
| Immutable task-event audit trail | Changes produce durable audit records rather than hidden mutable state. |
| Read-only replay | Historical task replay cannot change quality budgets. |
| UI safety language | The workspace explicitly states that budgets are informational review facts, not runtime limits or automatic outcomes. |

## Validation

The implementation was validated with strict TypeScript checking, the complete deterministic test suite, and the production build.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| `pnpm test` | Passed: 42 test files and 204 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing bundle-size advisories remain; they are not quality-budget failures. |
| Desktop capture | The unauthenticated managed preview showed the expected loading boundary; deterministic workspace regressions remain the authoritative verification for authenticated owner-scoped controls. |

No task, model, media, browser agent, sandbox, storage, queue, connector authorization, scheduled workflow, or external provider workload was started while building or validating this capability.
