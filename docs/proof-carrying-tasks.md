# Proof-Carrying Tasks

## Purpose

Proof-Carrying Tasks make a task’s material claims inspectable without pretending that a model assertion is proof. A task owner can record a specific claim, attach one or more **reviewed references**, state a verification status, communicate confidence, and add recovery guidance. The resulting record is user-owned, task-scoped, and connected to the existing ordered task-event history.

> **A proof record is a provenance record, not an automatic truth guarantee.** Synthia does not create, fetch, or silently verify evidence when a user records a claim.

## Operational model

| Element | What Synthia stores | What it does not store or claim |
|---|---|---|
| Claim | A bounded, user-authored outcome statement | An unreviewed model conclusion presented as fact |
| Reference | Label, source type, optional locator, and optional description | Source bytes, screen frames, audio, provider payloads, or hidden context |
| Verification | Explicit status: self-attested, unverified, corroborated, contradicted, or needs review | Automatic independent verification |
| Confidence | A user-selected 0–100 value | A calibrated probability guarantee |
| Recovery guidance | A concrete way to improve or challenge the claim | An automatic retry, browser action, provider call, or side effect |
| Audit event | An ordered `proof_record` event tied to the task | A separate opaque chat history |

## User workflow

Open a task’s **Proof** tab and choose **Record proof**. State the claim, select the reviewed reference type, provide a clear reference label, and optionally add a locator such as a URL, task-event identifier, or deliverable name. Select the verification status and confidence deliberately. When the claim is uncertain or could later be challenged, add practical recovery guidance such as an independent source to review or a scoped validation to rerun.

The task’s owner remains the only user who can list or record its proof records. The server checks task ownership before writing, limits mutation frequency, writes the proof record and task event atomically, and publishes the ordered event through the existing task-event channel.

## Safe-use rules

| Do | Do not |
|---|---|
| Record only sources you have reviewed or can accurately describe | Treat a citation label as an independently verified source |
| Use **unverified** or **needs review** when evidence is incomplete | Inflate confidence because an answer sounds persuasive |
| Mark a conflict as **contradicted** and specify recovery work | Hide conflicting evidence in a task summary |
| Use a durable reference label and locator | Put secrets, passwords, payment data, recovery codes, or private keys in a proof record |
| Keep recovery guidance action-oriented and bounded | Authorize a browser action, payment, publication, or external call merely by recording it |

## Privacy and retention boundary

Proof records retain only metadata that the task owner deliberately submits. They do not persist microphone recordings, display-share frames, attachment bytes, external provider prompts, or raw model evidence. A locator may reference a separately governed artifact or URL; access to the underlying resource remains subject to its existing task ownership and storage controls.

## Validation record

The initial release uses an additive PostgreSQL migration, ownership-scoped protected procedures, an inspectable responsive workspace tab, and deterministic regression checks. Validation completed with **38 passing test files**, **178 passing tests**, and **12 intentional opt-in checks skipped**; the production build passed. No model, provider, browser, sandbox, media, or storage workload was invoked while implementing or validating this capability.
