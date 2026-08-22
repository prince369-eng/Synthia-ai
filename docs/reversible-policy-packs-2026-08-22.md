# Reversible Task Policy Packs

## Purpose

Policy packs give an owner a durable, inspectable way to express recurring planning guidance for a task domain. They are deliberately narrower than automation rules: a pack can influence the text supplied to task planning, but it cannot create a task, start a worker, call a provider, use a connector, alter credentials, approve an action, or override task-level policy.

## Data contract and lifecycle

Each pack is owner-scoped and records a title, task domain, bounded planning guidance, evidence expectations, approval constraints, status, and audit-event references. The lifecycle is explicit: the owner can create, edit, inspect, enable, disable, or archive a pack. Archiving retains the durable audit trail while removing the pack from any later planning lookup.

| Status | Planning effect | Execution authority |
|---|---|---|
| `enabled` | The bounded guidance may be appended to a later owner task’s planning context. | None. |
| `disabled` | The pack is retained and visible but omitted from later planning context. | None. |
| `archived` | The pack is historically inspectable and omitted from planning context. | None. |

## Planning boundary

The task runner loads **only enabled packs belonging to the task owner** and turns them into a clearly labelled planning-context block. That block explicitly instructs the planner that the guidance is not permission to execute actions or bypass approvals. The existing action-policy enforcement, connected-app authorization checks, and approval records continue to evaluate every proposed action after planning.

Policy packs do not alter reviewed user lessons, skills, model/provider selection, credit policy, sandbox access, public-web policy, media routing, or task replay. They are reversible text guidance, not configuration or executable code.

## Workspace controls

The task workspace includes a dedicated **Policies** tab. It provides owner-only create, edit, enable/disable, archive, and inspection controls. The form explains the planning-only constraint, requires bounded input, and keeps replay mode read-only. Protected server procedures re-validate all values, confirm task ownership, append audit events, and rate-limit mutations.

## Validation

Migration `0016_orange_dakota_north.sql` adds the policy-pack table, lifecycle enum, audit event values, indexes, and foreign-key references. Regression coverage verifies owner scoping, reversibility, workspace visibility, and the planning-only safeguard. Strict TypeScript validation passed. The complete suite passed with **203 tests across 42 files** and **16 intentional opt-in skips**, and the production build passed with only existing bundle-size advisories. No external provider, storage, browser, sandbox, queue, media, connector, or task workload was initiated.
