# Synthia Virtual Multi-Vendor Network Lab Design

**Prepared by:** Manus AI  
**Date:** 23 August 2026  
**Status:** Architecture and delivery design only. No virtual lab, vendor image, device, connector, credential, or external workload has been activated.

## Confirmed product goal

Synthia will help a network engineer turn a change request into a reviewable virtual lab: a topology, addressing and protocol plan, vendor-specific draft configuration, validation checks, rollback criteria, and evidence. The engineer supplies properly licensed vendor images and runs the lab in their own isolated environment. Synthia receives only bounded, redacted evidence after an explicit validation request; it does not host vendor images, retain device credentials, or reach physical network devices.

> **Product promise:** Design and prove a multi-vendor network change in an isolated virtual lab before any production action.

## Architecture decision

The correct design is a **Synthia control plane** paired with a **customer-operated lab runner**. The browser workspace holds intent, topology, proposals, approvals, and evidence. A runner installed by the engineer on a lab host creates and destroys local VMs, applies only the signed lab manifest, and returns a bounded result package over an outbound authenticated channel. There is no inbound network path from Synthia into the lab host.

| Layer | Responsibility | Explicit boundary |
|---|---|---|
| Synthia Network Lab Workspace | Capture change intent, display topology, render draft configuration, declare validation criteria, collect approvals, and review evidence | Never starts VMs, stores vendor images, stores device credentials, or contacts devices |
| Customer-operated runner | Verifies a short-lived signed manifest, prepares the lab, executes an allow-listed validation plan, redacts evidence, and destroys the lab | Cannot execute generic shell commands, arbitrary scripts, or production-network actions |
| Lab substrate | VirtualBox local host, or an existing licensed network-lab platform selected by the engineer | Must be isolated from production and have no default internet egress |
| Vendor images | Engineer-provided, entitlement-attested, digest-recorded artifacts | Synthia never uploads, downloads, redistributes, or scans image contents |

## VirtualBox-compatible operating model

VirtualBox is viable as the initial **local lab substrate** where engineer-supplied appliances are compatible. It supports internal networking that is visible only between selected VMs, as well as host-only networking for a management connection between host and VMs; both are appropriate for a sealed lab topology.[1] By contrast, its NAT mode provides outbound connectivity and is therefore prohibited by default, while bridged networking may place lab traffic directly on a physical LAN and is prohibited in the first release.[1]

VirtualBox supports OVF/OVA appliance import and common disk containers including VDI and VMDK, but its OVF implementation does not guarantee support for every appliance created by other virtualization products.[2] The runner must therefore validate a submitted image manifest against a **tested compatibility profile** rather than promise that every vendor image will run in VirtualBox.

| Mode | Initial policy | Reason |
|---|---|---|
| VirtualBox internal network | Required for data-plane links | VM-to-VM only; isolates the topology from host and outside networks.[1] |
| VirtualBox host-only network | Optional management plane only | Allows runner-to-lab management without a physical NIC.[1] |
| NAT / NAT Network | Denied by default | It permits outbound connections and can expose host-adjacent services.[1] |
| Bridged adapter | Denied | It sends lab traffic onto the physical network.[1] |
| Port forwarding | Denied | No guest service exposure beyond explicit local runner controls |

## Vendor-family strategy

The initial target families are **Cisco, Juniper, and Arista**, but Synthia must label support at the image/profile level—not claim universal vendor compatibility. Each accepted image must have a declared vendor family, version, format, CPU/RAM profile, license/entitlement attestation, SHA-256 digest, and runner compatibility result.

| Vendor family | First-runner posture | Licensing and fidelity boundary |
|---|---|---|
| Cisco | Prefer a customer-managed Cisco Modeling Labs adapter rather than importing CML images into VirtualBox | Cisco states that CML-supplied VM images are licensed only for use within CML; a lab also validates control/management-plane behavior rather than throughput or timing.[3] |
| Juniper | Permit customer-provided vJunos lab images after profile compatibility checks | Juniper positions vJunos lab products for non-production configuration and control-plane testing, with no commercial support; Synthia records the accepted license acknowledgement.[4] |
| Arista | Permit a customer-provided, entitled virtual EOS/CloudEOS profile after compatibility checks | Arista’s virtual router usage relies on the applicable subscription/BYOL or license model; Synthia neither stores nor imports the license file.[5] [6] |

## Network Lab Workspace

The workspace introduces typed, owner-scoped records. Generated material remains **Draft — not validated** until a human requests a lab run and the runner returns verified evidence.

| Entity | Required fields | Safety purpose |
|---|---|---|
| `NetworkChangeIntent` | objective, scope, sites, vendors, constraints, success conditions, rollback objective | Converts free-form requests into an auditable change proposal |
| `TopologySpec` | nodes, links, interfaces, addressing, protocol intent, assumptions | Enables review before any lab resource is created |
| `ImageReference` | owner, vendor family, compatibility profile, digest, entitlement attestation, local runner alias | Identifies an image without uploading or exposing it to Synthia |
| `ConfigCandidate` | device target, vendor family, rendered configuration, structured diff, warnings | Keeps configuration reviewable and prevents arbitrary command bundles |
| `ValidationPlan` | assertions, baselines, failure criteria, resource ceiling, evidence requirements | Separates the outcome to prove from the runner implementation |
| `LabManifest` | topology, permitted image references, allowed validations, expiry, resource quota, nonce, signature | Defines one narrow, replay-resistant local lab job |
| `ValidationEvidence` | run identifier, state summary, assertion results, redacted excerpts, artifact hashes, runner attestation | Returns usable proof without raw output or secrets |

## Signed runner protocol

The runner must be an installed local service under the engineer’s control. It establishes an outbound authenticated connection to Synthia, polls only after the engineer has approved a lab run, and accepts no remote shell or general-purpose task capability.

1. An engineer creates and approves a typed topology and validation plan in Synthia.
2. Synthia issues a single-use, short-lived manifest containing only pre-approved topology, image aliases, resource quotas, and validation assertions.
3. The local runner verifies issuer, signature, owner scope, expiration, nonce, and its own compatibility policy before it touches the lab substrate.
4. The runner prepares isolated internal networks, starts only approved local image aliases, pushes deterministic draft configuration, and runs allow-listed checks.
5. The runner captures bounded output, removes secrets and sensitive configuration lines, computes artifact hashes, destroys or resets the lab, and returns the signed evidence package.
6. Synthia verifies the attestation and shows the result as **validated**, **failed**, **incomplete**, or **not comparable**. It never infers production readiness solely from a successful virtual test.

## Non-negotiable lab safeguards

| Control | Required behavior |
|---|---|
| Default deny | No runner action occurs until a specific lab run is approved. |
| Egress isolation | Internal networks are default; NAT, bridging, cloud adapters, and port forwards are off unless a future explicit policy allows them. |
| Resource budgets | Per-run CPU, RAM, disk, node-count, runtime, and artifact-size ceilings are mandatory. |
| Image integrity | Local runner checks the declared SHA-256 digest and compatibility profile before launch. |
| License boundary | Engineer confirms entitlement locally; no image or license data is sent to Synthia. |
| Command boundary | No generic shell, CLI, script upload, arbitrary image import, or auto-repair path. |
| Evidence redaction | Remove passwords, private keys, tokens, SNMP communities, and sensitive addressing before any evidence upload. |
| No production bridge | The runner rejects bridged NICs, production routes, and device control targets in the initial release. |
| Kill switch | Engineer can stop a run locally; Synthia can revoke an undispatched manifest and disable a runner registration. |

## Delivery choices

Two paths are viable. The first is lighter-weight and directly satisfies a VirtualBox-based practice lab. The second is better for larger or vendor-specific virtual images but requires an existing licensed lab platform.

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| **A. Local VirtualBox runner** | Supports compatible engineer-supplied OVF/OVA, VDI, or VMDK profiles; ideal for small sealed topologies. Some vendor images will not be compatible, and fidelity/performance tests are limited. | Uses the engineer’s existing lab host; vendor entitlements remain separate. | Moderate |
| **B. Existing licensed lab-platform runner** | Integrates with a local Cisco Modeling Labs or another engineer-operated lab platform; stronger support for vendor-native workflows, but platform administration and licensing are required. | Existing platform and image licenses apply. | Higher |

## Staged implementation

| Stage | Synthia capability | Runner capability | Access boundary |
|---|---|---|---|
| 0. Policy and data model | Typed records, image-reference policy, topology schema, redaction rules, approval matrix | None | No lab activity |
| 1. Network Lab Workspace | Manual sanitized topology input, change intent, assumptions, validation/rollback checklists, evidence template | None | No lab activity |
| 2. Proposal engine | Vendor-neutral topology IR, deterministic config candidates, diff, unsupported-feature warnings | None | No lab activity |
| 3. Local VirtualBox runner | Manifest issuance, approval view, evidence verification | Local image profile check, isolated internal topology, bounded tests, cleanup | Local virtual lab only |
| 4. Vendor adapters | Per-family config renderer and validated profile catalogue | Cisco CML / Juniper / Arista local adapter where entitled | Lab only |
| 5. Read-only inventory | Snapshot import and optional exact-allow-list source-of-truth reads | Optional customer-side connector | Read-only only |

## Explicit exclusions

The initial product will not implement production device writes, access to physical switches/routers/firewalls, bridged production connectivity, arbitrary CLI execution, general shell access, unattended remediation, vendor-image download or redistribution, license-file retention, or automatic change closure. A virtual lab validates selected control-plane and configuration behavior; it is not proof of throughput, timing, ASIC behavior, licensing, or full production equivalence.[3]

## Decisions required before building Stage 0–1

1. Confirm **Approach A** (VirtualBox-first local runner) or **Approach B** (existing licensed lab-platform runner first).
2. Confirm the initial vendor order: Cisco, Juniper, Arista—or name a different first three.
3. Confirm whether the initial release is **design-only** (Stages 0–2) or includes the local-runner contract (Stage 3) after local host requirements are agreed.
4. Confirm the engineer’s lab host operating system: Windows, macOS, or Linux. This controls installer, privilege, networking, and image-profile validation design.

## References

[1]: [Oracle VM VirtualBox User Manual — Virtual Networking](https://www.virtualbox.org/manual/ch06.html)  
[2]: [Oracle VM VirtualBox User Manual — Importing and Exporting Virtual Machines](https://docs.oracle.com/en/virtualization/virtualbox/6.0/user/ovf.html)  
[3]: [Cisco Modeling Labs — VM Images for CML Labs](https://developer.cisco.com/docs/modeling-labs/vm-images-for-cml-labs/)  
[4]: [Juniper — Free Virtual Junos OS Download for Labs](https://www.juniper.net/us/en/dm/vjunos-labs.html)  
[5]: [Arista — EOS Feature Licensing](https://www.arista.com/en/support/product-documentation/eos-feature-licensing)  
[6]: [Arista — CloudEOS Router License Management](https://www.arista.com/en/cg-veos-router/veos-router-license-management)
