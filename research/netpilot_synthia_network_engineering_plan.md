# NetPilot Capability Assessment and Synthia Network Engineering Plan

**Prepared by:** Manus AI  
**Date:** 23 August 2026  
**Scope:** Product study and implementation planning only. No network device, lab, connector, credential, model-provider, or external service was activated.

## Executive assessment

NetPilot is relevant to Synthia because it treats network engineering as a controlled workflow rather than a conversational answer. Its public material describes an agent that translates an engineering intent into a topology, vendor-specific configurations, an isolated runnable lab, validation evidence, and an engineer-reviewed decision. It also distinguishes read-only source-of-truth access and pre-production rehearsal from production change execution. [1] [2] [3]

> NetPilot describes its product as designing, building, and validating multi-vendor networks from plain-English intent, while keeping the engineer responsible for the intent, judgment, and sign-off. [1]

Synthia should adopt the **workflow pattern**, not attempt to copy a network-lab platform inside the existing managed web runtime. The correct product is a **Network Change Workspace** within Synthia: an owner-scoped control plane that creates inventory snapshots, change proposals, signed lab manifests, validation evidence, and approval-gated change sets. An isolated runner or customer-operated execution plane performs any actual lab work. Production network mutations remain out of scope until a later, separately approved phase.

| Decision | Recommendation | Rationale |
|---|---|---|
| Product positioning | Add a **Network Change Workspace**, not an autonomous production-network operator | Aligns with Synthia’s approval-first model and avoids overstating operational authority. |
| Initial data access | Read-only inventory and configuration import only | Mirrors the least-privilege direction described by NetPilot’s NetBox/Nautobot model. [3] |
| Validation plane | Isolated, disposable runnable labs through a separate runner | Vendor network images, licensing, isolation, and egress control do not fit the current managed web runtime. [2] [4] |
| Production change execution | Disabled by default; later opt-in only | A production mutation needs maintenance-window binding, change approval, rollback proof, and stringent identity controls. |
| AI role | Draft, explain, reconcile evidence, and propose—not silently apply | Prevents automation from becoming an unreviewed network-control path. |

## What NetPilot publicly appears to provide

NetPilot’s public product material describes a workflow that begins with a natural-language engineering goal and produces a topology, addressing and protocol relationships, and per-vendor configuration. It then deploys a multi-vendor lab with real network operating-system instances, captures baseline state, tests candidate change behavior, and presents a before/after diff and validation verdict. The stated use cases include BGP, firewall and ACL policy, OSPF/IS-IS, upgrades, migrations, failover, and automation-tool testing. [1] [2]

> The public workflow is effectively: define intent; read a source of truth; draft topology and configuration; review; run a disposable lab; collect evidence; and decide whether the proposed change is ready. [2]

The documented integration posture is important. NetPilot describes NetBox, Nautobot, and Nornir integrations as read-only by default, with exact tool allow-lists rather than broad wildcards, an HTTPS requirement, authentication and a successful handshake prior to enablement. It also describes a separately opt-in, show-command-only live-device path and says connector tokens are encrypted and write-only. [3]

| NetPilot capability pattern | User outcome | Synthia equivalent | Initial implementation status |
|---|---|---|---|
| Intent-to-topology generation | Turns a request into a structured network design | Change intent form plus typed topology specification | Phase 1 |
| Vendor-specific configuration generation | Produces reviewable device configuration candidates | Vendor template engine with structured diffs | Phase 2 |
| Read-only source-of-truth integration | Grounds a proposal in inventory and current state | Read-only inventory connector contract | Phase 3 |
| Runnable digital twin | Tests changes before production | Signed lab manifest sent to an isolated runner | Phase 4 |
| Baseline, post-change capture, and diff | Creates an evidence trail | Synthia proof/evidence model plus validation report | Phase 4 |
| Live-device observation | Diagnoses from production safely | Explicit opt-in, read-only command capability | Phase 5 |
| Production execution | Applies a change to a live network | Separate, disabled-by-default privileged operation | Phase 6, only after governance review |

## Fit with Synthia’s current product architecture

Synthia already has several foundations that fit this domain: owner-scoped tasks, immutable task events, approval-first operation patterns, reviewable change sets, evidence/proof surfaces, quality budgets, connector catalog patterns, and configuration-gated external capability handling. The network-engineering addition should reuse those boundaries rather than create a parallel agent subsystem.

The key architectural distinction is between the **control plane** and the **execution plane**. Synthia’s web application should capture intent, policy, approvals, artifacts, and evidence. It should never itself host vendor virtual network operating systems, retain device credentials, or reach arbitrary network equipment. A separate isolated runner—initially a customer-operated runner or an explicitly provisioned protected environment—would accept a signed, short-lived lab manifest and return bounded evidence artifacts.

| Synthia layer | Network Change Workspace responsibility | Must not do |
|---|---|---|
| React workspace | Display intent, topology summary, diffs, evidence, approvals, and decision state | Render secrets, raw runner errors, or arbitrary device output without redaction. |
| tRPC/Express service | Enforce owner scope, policy, approval state, short-lived dispatch tokens, audit records | Directly connect to production network devices. |
| Database and S3 evidence storage | Store change metadata, immutable approval trail, artifact hashes, signed evidence references | Store plaintext device passwords, SSH private keys, or vendor images. |
| Isolated runner | Build disposable lab, execute allow-listed validation plan, collect bounded results | Operate as a generic egress host or production-network bridge. |
| Optional customer-side agent | Reach an internal source of truth or internal lab under customer control | Escalate to write access or cross tenant/environment boundaries. |

## Recommended product model

The product should be introduced as **Synthia Network Change Workspace**. A network engineer begins a task by stating an objective such as “propose and validate a BGP policy change for the branch WAN.” Synthia asks for the intended affected scope, source-of-truth snapshot, desired behavior, maintenance constraints, and rollback expectations. It produces a typed `NetworkChangeIntent`, never a free-form action that can silently become device configuration.

The model then generates a human-readable design brief, a vendor-neutral topology specification, and vendor-specific candidate configuration fragments. Every generated artifact must be marked **draft**, associated with a source snapshot hash, and pass schema plus policy validation before an engineer can request lab validation.

> The product promise should be: **“Plan and prove a network change before any production action.”** It should not be: “Synthia autonomously reconfigures your network.”

### Core domain model

| Entity | Minimum fields | Security and governance purpose |
|---|---|---|
| `NetworkChangeIntent` | owner, title, business objective, scope, affected sites, vendor families, constraints, rollback goal | Creates an auditable request and prevents unstructured command execution. |
| `InventorySnapshot` | source label, environment, collected-at, artifact hash, normalized topology summary, completeness indicator | Grounds all generated output in a specific read-only snapshot. |
| `TopologySpec` | nodes, links, interfaces, addressing, protocol intent, assumptions | Supports deterministic review and lab-manifest generation. |
| `ConfigCandidate` | device target, vendor family, rendered config, source references, diff, confidence, warnings | Keeps generated configuration reviewable and traceable. |
| `ValidationPlan` | assertions, fixtures, baseline checks, failure criteria, evidence requirements | Separates “what to prove” from “how a runner executes it.” |
| `LabManifest` | signed payload, source hashes, allowed images, egress policy, TTL, runner target | Gives the runner a non-secret, bounded job definition. |
| `ValidationEvidence` | artifact hash, result summary, timestamps, runner attestation, redaction state | Creates proof without exposing raw sensitive output. |
| `ChangeSet` | proposal, approvals, policy results, maintenance window, rollback plan, final disposition | Reuses Synthia’s approval-first workflow for any later production phase. |

## Phased implementation plan

### Phase 0 — Product and security design gate

Before code changes, define supported vendor families, source-of-truth formats, lab runner ownership, evidence retention rules, and the exact boundary between validation and production. Establish a threat model covering malformed inventory, prompt injection carried in device descriptions, secrets in configuration, poisoned or incomplete source-of-truth records, untrusted vendor images, runner escape, and destructive production actions.

Deliverables are an approved architecture decision record, a policy matrix, typed domain schema, redaction policy, and a sample evidence pack. The gate is passed only when product owners explicitly confirm that **no production write capability** is included.

### Phase 1 — Read-only Network Change Workspace

Build the user-facing workspace without external connectors. It accepts manually uploaded or pasted sanitized topology/configuration data, validates it against a strict schema, and creates a `NetworkChangeIntent`. Synthia can generate a structured design brief, an assumption register, an impact checklist, a test plan, and a rollback checklist, but it cannot dispatch work to a network or lab.

This phase should use existing owner-scoped task and evidence patterns. It needs loading, empty, failure, and approval-pending states; artifact provenance; a compact topology/diff view; and explicit “draft—not validated” markers. It is useful even before any integration because it turns informal change tickets into reviewable engineering evidence.

### Phase 2 — Deterministic topology and configuration proposal engine

Add typed topology specification and vendor-template rendering. Rather than allowing a model to produce directly executable arbitrary command bundles, the model emits a vendor-neutral intermediate representation validated with Zod. Deterministic renderers generate per-vendor candidates, and a policy layer rejects unsupported command classes, unknown device targets, embedded secrets, and unbounded template expansion.

The output should include diffs, assumptions, unsupported-feature warnings, and a test matrix. Add golden tests for known topology fixtures, property tests for input validation, and snapshot tests for configuration rendering. Still do not add lab provisioning or source-of-truth connectivity.

### Phase 3 — Read-only inventory connectors

Introduce a connector framework for read-only inventory sources such as NetBox, Nautobot, or a customer-hosted inventory export. Each connection should be per owner and environment labeled, use an exact read-tool allow-list, require endpoint validation and a handshake, and issue a short-lived delegated access token to the customer-operated connector or server-side broker.

The first connector API should expose only normalized snapshot reads such as `list_sites`, `get_devices`, `get_interfaces`, `get_prefixes`, and `get_config_context`. It must not expose generic arbitrary queries, mutation endpoints, jobs, or scripts. Connector secrets must be write-only; Synthia stores an opaque connection reference and never sends secret values to the browser.

### Phase 4 — Isolated runnable-lab validation

Add a runner protocol rather than a lab engine to the web application. A runner receives a signed lab manifest with a strict expiry, an allowed image set, an internal-only topology, resource budgets, and no default internet egress. It returns a signed result package containing the validation plan outcomes, bounded CLI/output excerpts, artifact hashes, and environment attestation.

Start with a customer-operated runner or a dedicated isolated environment. Vendor images must be bring-your-own and license-verified; do not download, redistribute, or bundle commercial network operating-system images. Open-source network images can be admitted only through an allow-list, image digest verification, CVE policy, and explicit owner approval.

### Phase 5 — Controlled observation and evidence-driven recommendation

If customers need live context, introduce a separate **Observe Production** capability. It must be opt-in per connection, read-only, limited to an allow-listed show-command vocabulary, scoped to named sites/devices, constrained by rate limits, and fully audited. The UI should state that live observations can be stale, incomplete, or inconsistent with the lab snapshot.

Synthia compares the live observation, inventory snapshot, lab results, and proposed config. It outputs a recommendation with confidence, evidence gaps, an explicit “do not proceed” state, and a rollback plan. It still does not make production changes.

### Phase 6 — Privileged execution, only if separately approved

Production changes should remain disabled by default and must not be included in early launch claims. If this phase is later approved, each operation requires a specific typed action, named devices, a bounded command/change package, maintenance-window binding, policy simulation, a tested rollback plan, two-person approval, step-up authentication, a just-in-time secret lease, full transcript/evidence capture, and an emergency stop.

No general shell, arbitrary script, arbitrary device command, background autonomous remediation, or always-on agent should be introduced. Any failure automatically transitions the change set to a halted state and preserves evidence for human review.

## Security controls that are non-negotiable

| Control | Required behavior | Reason |
|---|---|---|
| Default deny | No connector, runner, network, or production access is active until explicitly configured and approved | Keeps ordinary use and tests from touching infrastructure. |
| Read/write split | Inventory and observation have separate contracts from execution | Prevents read scopes from silently expanding into write capability. |
| Exact allow-lists | Permit named read tools and commands only; no wildcards or arbitrary query execution | Narrows the attack surface and supports auditability. |
| Environment separation | Production, staging, and lab connections are separate labeled resources with distinct policies | Prevents accidental cross-environment actions. |
| Secret brokering | Use short-lived server-side or customer-runner leases; never render or persist plaintext device credentials | Reduces credential exposure and blast radius. |
| Lab isolation | Separate tenant network, no default egress, CPU/memory/time quotas, disposable storage, signed images | Limits runner compromise and abuse. |
| Provenance | Attach source snapshot hashes, model/version, policy decision, approval identity, and evidence hashes to every proposal | Makes results reproducible and reviewable. |
| Redaction | Treat configs, CLI output, errors, and inventories as sensitive; redact secrets and bound output before persistence/display | Prevents diagnostic leaks into tasks and evidence views. |
| Human gate | Require explicit approval before lab dispatch and any privileged action | Preserves the product’s approval-first semantics. |
| Kill switch | Disable a connector, runner, or environment immediately and halt queued operations | Supports containment during an incident. |

## Delivery prerequisites and decision points

| Decision | Required before | Owner decision needed |
|---|---|---|
| Initial source of truth | Phase 3 | Choose NetBox, Nautobot, sanitized file import, or a customer API adapter. |
| Runner location | Phase 4 | Choose customer-operated runner, dedicated Synthia isolation, or defer labs. |
| Supported vendors | Phase 2 | Select the first vendor templates; avoid claiming universal support. |
| Image policy | Phase 4 | Confirm which open-source or customer-licensed images are permitted. |
| Evidence retention | Phase 1 | Select retention, encryption, export, and deletion policy for configs/output. |
| Identity and approvals | Phase 3 | Confirm SSO/role model, approver separation, and maintenance-window authority. |
| Production execution | Phase 6 | Explicitly approve or permanently exclude it from the product roadmap. |

## Recommended first release

The first release should contain only **Phase 1** plus the preparatory schema/policy work from Phase 0. It produces value without any access to a customer network: structured change intent, topology/model proposal, impact checklist, validation plan, rollback plan, evidence template, review states, and approval record. A second release can add deterministic configuration rendering for a narrowly chosen vendor set.

This staged approach protects Synthia’s current operating assumptions: external services remain configuration-gated, task execution remains approval-first, and customer infrastructure cannot be contacted during ordinary product use or tests. It also avoids a misleading “autonomous network engineer” claim before isolated validation and enterprise governance exist.

## Explicitly out of scope for the initial release

The initial release will not contain production device writes, arbitrary CLI access, arbitrary MCP tools, device-secret storage, always-on monitoring, autonomous remediation, commercial vendor-image redistribution, shared lab environments, automatic ticket closure, or network access from Synthia’s managed web runtime. These exclusions are intentional safety and product-boundary decisions.

## References

[1]: [NetPilot — AI for Networks: Build & Validate Multi-Vendor Labs](https://www.netpilot.io/)  
[2]: [NetPilot — Network Engineering Agent Features](https://www.netpilot.io/features)  
[3]: [NetPilot — NetBox MCP Server with an AI Network Engineer](https://www.netpilot.io/blog/netbox-mcp-server-ai-lab)  
[4]: [NetPilot — Enterprise Deployment Options](https://www.netpilot.io/enterprise)  
[5]: [NetPilot — Digital Twin from NetBox](https://www.netpilot.io/blog/network-digital-twin-from-netbox)  
[6]: [NetPilot — Network Change Validation](https://www.netpilot.io/network-change-validation)  
[7]: [NetPilot — Integrations](https://www.netpilot.io/integrations)
