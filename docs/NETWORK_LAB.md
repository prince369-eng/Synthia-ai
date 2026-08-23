# Network Lab Workspace and Linux Runner Plan

The Network Lab Workspace provides an engineer-reviewed control plane for multi-vendor virtual labs. It is not a cloud network emulator and it does not connect to production infrastructure.

## Current workflow

1. The engineer creates a topology, configuration candidates, validation assertions, and a rollback plan.
2. Synthia stores the proposal under the owner account and submits it for review.
3. An explicit approval enables a short-lived signed manifest.
4. A future local Linux runner verifies the manifest, creates only an isolated internal topology, applies only approved candidates, performs allow-listed validation, cleans up, and prepares redacted evidence.
5. The engineer reviews the evidence before it is submitted to the control plane.

## Supported design intent

The first vendor families are Cisco, Juniper, and Arista, but the engineer supplies any licensed image under their own entitlement. Synthia must store only an image alias, compatibility profile, digest, entitlement acknowledgement, and resource profile—not the image, license file, or device credentials.

## Linux runner prerequisites

| Requirement | Why it matters |
|---|---|
| Linux host or Linux guest with nested virtualization enabled | VirtualBox must be able to create inner lab VMs. A Windows host with Linux in VirtualBox needs nested virtualization support. |
| VirtualBox installation on the Linux lab host | The runner remains separate from the deployed web app. |
| Dedicated non-administrator runner account | Limits host-level blast radius. |
| Internal-only VirtualBox networking | Prevents lab adapters from bridging to the LAN or reaching production infrastructure. |
| Pinned Ed25519 runner public key | Lets the runner verify server-issued manifests without storing the server private signing key. Synthia stores `SYNTHIA_NETWORK_LAB_MANIFEST_PRIVATE_KEY` only in encrypted server settings; the paired public key stays with the local runner. |
| Licensed vendor images supplied by the engineer | Preserves vendor licensing and image custody. |

## Non-negotiable runner rejections

The runner must reject bridged adapters, NAT adapters, NAT networks, port forwarding, cloud adapters, physical-device targets, arbitrary shell commands, unsupported vendor aliases, expired manifests, replayed manifests, over-limit resource requests, raw credentials in configurations, and evidence containing key-shaped secret material.

## Current limitation

The workspace and Ed25519 manifest contract exist, but the database migrations must be applied to the configured PostgreSQL deployment database. The local runner package and the production private/public key pair are not yet configured. No lab has been started, no vendor image has been imported, and no device has been contacted.
