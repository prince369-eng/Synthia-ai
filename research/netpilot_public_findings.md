# NetPilot public product findings

Source reviewed: https://www.netpilot.io/ (accessed 2026-08-23).

## Publicly stated capabilities

- NetPilot describes an AI agent for network engineering that designs, builds, and validates multi-vendor networks.
- The public page states that its engineering skills include topology design, per-vendor configuration generation, and validation across Cisco, Juniper, Arista, and Nokia.
- It positions its workspace as a real multi-vendor lab using actual network operating systems over SSH, rather than a simulation.
- It describes building a digital twin to prove a change before shipment.
- The public page describes an MCP server for invoking NetPilot from external AI agents, and states that its agent can connect to existing systems.
- NetBox, Nautobot, and Nornir are described as built-in read-only connectors. Configuration repositories, ticketing, CI/CD, and other MCP-enabled tools are described as custom integrations on higher plans.

## Initial Synthia relevance

The closest capability pattern is an approval-first network-change workspace: intent capture, inventory ingestion, isolated digital-twin validation, evidence generation, and human-approved change execution. No connection, lab, device, connector, provider, or network operation was initiated during this research.

## Detailed product workflow and safety claims

Sources reviewed: https://www.netpilot.io/features, https://www.netpilot.io/integrations, https://www.netpilot.io/network-digital-twin, and https://www.netpilot.io/network-change-validation (accessed 2026-08-23).

NetPilot describes a five-step workflow: capture a natural-language network intent; generate a topology with addressing, interfaces, and protocol relationships; create vendor-specific configurations; deploy an isolated lab of actual network operating-system instances; and validate routing, adjacencies, reachability, VPN paths, throughput, latency, or failover. It describes pre-change baseline capture, candidate-change application, post-change capture, and state-diff evidence as the core change-validation loop.

Publicly listed use cases include BGP, ACL or firewall policy, OSPF and IS-IS changes, routing migration, vendor comparison, software upgrades, failover scenarios, and automation testing of Ansible, Nornir/Netmiko/NAPALM, Terraform, and Python against lab CLIs. Its primary distinction is an on-demand, runnable digital twin rather than continuous passive production telemetry.

The product claims dedicated cloud VMs per lab and an enterprise on-prem option. It states that its agent does not modify production devices. Its live-network Nornir connector is described as show-command-only, enforced server-side; device credentials are brokered from Nautobot when needed and are not stored. NetBox and Nautobot MCP connections are described as exact read-tool allow-lists, with mutation and Nautobot job tools excluded. The page also states that connector tokens are encrypted at rest and write-only, HTTPS endpoints are required, and a connection must pass a handshake before enablement.

NetPilot publicly positions external connectivity in two directions: a caller can invoke its MCP server to build labs, while its agent can read inventory or integrate with Git, ticketing, CI/CD, and other MCP/API-capable systems. The latter integrations are described as custom or enterprise capabilities. Commercial network OS images are positioned as bring-your-own-image, while Nokia SR Linux, FRR, and Linux are identified as built-in in the public material.

## Product implications for Synthia

For Synthia, a responsible equivalent should separate evidence-oriented pre-production rehearsal from any production execution. The first product scope should be read-only inventory and observation, offline or isolated lab validation, evidence capture, and a manually reviewed change set. Production-side execution, secrets brokerage, lab image licensing, network reachability, and MCP connector enablement require a separate operator-approved phase and must remain disabled by default.

## Enterprise, deployment, and integration findings

Additional sources reviewed: https://www.netpilot.io/enterprise, https://www.netpilot.io/docs, https://www.netpilot.io/blog/network-digital-twin-from-netbox, and https://www.netpilot.io/blog/netbox-mcp-server-ai-lab (accessed 2026-08-23).

NetPilot describes four deployment shapes: self-serve cloud, dedicated resources, customer-environment/on-prem, and fully air-gapped deployment. The public enterprise page states that an air-gapped deployment can use a local model runtime, while connected on-prem deployments can select a cloud model provider. It claims single sign-on, audit logging for lab deployment and CLI commands, lab isolation, and bring-your-own licensed network operating-system images or sanitized configurations.

The documented engineering loop is: read a site source of truth; draft a topology and per-vendor configurations; require review before the lab starts; deploy a lab with real network operating-system containers; collect pre-change baseline state; apply the candidate change only in that isolated lab; capture post-change state; produce a diff and an evidence-based verdict. The public material explicitly distinguishes this runnable twin for execution rehearsal from model-based verification at large production-network scale; Synthia should retain that distinction in product claims.

The NetBox article specifies an HTTPS MCP endpoint plus endpoint authentication for remote connection, a live handshake before enablement, exact read-tool allow-lists with no wildcards, and write-only encrypted connector tokens. It says a user may have separate labeled connections, such as production and staging, and calls out limitations: source-record completeness determines twin fidelity, connections are per-user, and the workflow does not write back to NetBox. A separate live-device path is positioned as opt-in, read-only show-command visibility only, with device credentials brokered at call time rather than retained by the product.

## Implications for Synthia plan design

Synthia should not emulate vendor network operating systems in its managed web runtime. A production-grade implementation requires an isolated lab execution plane, vendor image-license controls, network egress restrictions, data classification, and optionally a customer-operated/on-prem runner. The Synthia core product should remain a control plane: collect intent and read-only inventory, generate a signed lab manifest and validation plan, dispatch only to an isolated runner after explicit approval, ingest bounded evidence, and create a reviewable change set. Any later production action must be a distinct, disabled-by-default connector capability with two-person approval, least-privilege write scope, explicit maintenance-window binding, immutable audit records, and a tested rollback proposal.
