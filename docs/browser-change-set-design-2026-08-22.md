# Browser Change-Set Design

**Status:** Implemented and validated as durable owner-scoped review data. No browser capability, connection, or action is activated by this feature.

## Purpose

A browser change set will let a task owner record a proposed, reviewable sequence of changes for a named public web destination. It is a governance record—not an instruction to navigate, interact with a page, authenticate, fill a form, upload data, submit a form, or control a browser session.

> A browser change set has **zero execution authority**. It cannot bypass connected-app authorization, user approval, public-web policy, browser availability, host restrictions, or sensitive-action confirmation.

| Field | Bounded meaning |
|---|---|
| Title | Short owner-authored description of the proposed change. |
| Target URL | A bounded URL-shaped reference stored and displayed as inert plain text; it is not opened, fetched, resolved, or otherwise evaluated. |
| Proposed changes | One to twelve ordered, declarative, human-readable proposal lines; never executable commands, selectors, or scripts. |
| Reviewer guidance | A bounded owner-authored statement of what a human should inspect. |
| Requires human review | A persisted review expectation that does not create an approval or change task permissions. |
| Status | Active or archived. Archived records remain inspectable through durable task events. |

## Safety Model

Records are owner-scoped to the source task and backed by protected, rate-limited create, update, and archive procedures. Creating, editing, or archiving a record appends a durable `browser_change_set` task event with `execution: "review_context_only"`. The task snapshot includes the owner-scoped records, and the workspace exposes them in a replay-safe **Changes** tab only.

The implementation treats the reference URL and proposed changes as bounded declarative text. It does not add CSS selectors, DOM automation payloads, browser start controls, navigation handlers, clickable URL rendering, cookies, credentials, token fields, file bytes, uploads, scripts, form submission, or user-controlled HTTP request options. The task runner does not import or load browser change-set records.

## Implemented validation

Strict TypeScript validation, the task-snapshot fixture, and deterministic source-contract coverage verify the owner scope, review-only task-event marker, protected API procedures, replay-safe workspace tab, inert reference display, and absence of task-runner loading. The public preview bootstrap repair was separately verified without starting a task, browser agent, provider, queue, or external workload.

> A separately designed future execution system would require explicit user approval, a trusted browser provider, public-web destination checks, and sensitive-action confirmation at the moment of action. This feature is not that system.
