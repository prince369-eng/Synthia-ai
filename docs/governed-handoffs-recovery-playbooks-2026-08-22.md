# Governed Handoffs and Recovery Playbooks

## Purpose

Synthia now supports two owner-scoped, durable forms of operational guidance: **handoff policies** for a future specialist proposal and **recovery playbooks** for a future recovery proposal. They make known preferences and repeatable safeguards inspectable without permitting silent delegation, remediation, or changes to task state.

## Handoff policies

A handoff policy records a task category, a specialist role, tightly bounded scope, required evidence, a budget limit, and a time limit. It is attached to the task from which the owner authored it and is persisted as an auditable event. A policy can guide a later **proposal**, but it cannot create a specialist task, approve work, enqueue a job, invoke a tool, or execute a delegation.

Every handoff remains subject to the existing task-level approval boundary. Archiving a policy preserves its audit record and prevents future use as guidance; it does not remove prior events.

## Recovery playbooks

A recovery playbook stores explicit trigger conditions, proposed steps, applicability, blast-radius preview, rollback guidance, evidence requirements, and a risk level. It is a review template only. It does not monitor a task, detect a failure, trigger itself, execute recovery steps, or repair data, files, permissions, integrations, or task state.

Any future use must be presented as a separately reviewable proposal with the defined evidence and rollback information. The owner must explicitly approve that later proposal before any governed operational action can proceed.

## Security and ownership boundary

All reads and mutations are protected and owner-scoped. The data layer verifies the task owner before listing, creating, editing, or archiving either record type. Each mutation appends a durable task event and uses proposal-only metadata. The schema enforces references to the owner, source task, and audit event, and uses one event per persisted governance record.

The workspace exposes the controls in distinct **Handoffs** and **Playbooks** tabs. Replay mode is read-only. Forms require bounded inputs and are validated again at the protected server contract. No connected-app, model, browser, media, sandbox, storage, queue, or provider call is started by opening, saving, editing, or archiving these records.

## Validation

The migration `0015_cooing_nightmare.sql` adds the durable tables, status enums, audit-event values, foreign keys, and query indexes. The full deterministic suite passed with **215 tests** and **16 intentional opt-in skips**. Strict TypeScript validation and the production build also passed. A workspace preview confirmed the refined task-entry experience; no task or external workload was initiated during this implementation.
