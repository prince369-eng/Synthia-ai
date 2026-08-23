/**
 * Customer-operated Linux Network Lab runner. This package verifies approved
 * manifests and emits a dry-run plan only; it has no VM, subprocess, network,
 * image-import, or device-control capability.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash, verify } from "node:crypto";

const REQUIRED_OPERATIONS = ["preflight", "resolve_image_alias", "prepare_internal_topology", "apply_candidate_config", "run_validation", "collect_bounded_evidence", "cleanup"] as const;
const BLOCKED_TERMS = /\b(bridge|bridged|nat|port[ _-]?forward|cloud|physical[ _-]?device|ssh\s+|curl\s+|wget\s+|bash\s+|sh\s+|password|private[ _-]?key|api[ _-]?key|token|snmp)\b/i;

type NodeRecord = { id: string; label: string; vendorFamily: "cisco" | "juniper" | "arista"; imageAlias: string; role: "router" | "switch" | "firewall" | "host" };
type LinkRecord = { id: string; sourceNodeId: string; targetNodeId: string; sourcePort: string; targetPort: string };
type ManifestPayload = {
  version: 1;
  manifestId: string;
  labId: string;
  approvalId: string;
  ownerId: number;
  issuedAt: string;
  expiresAt: string;
  runner: {
    platform: "linux_virtualbox";
    allowedOperations: string[];
    networkPolicy: { internalNetworkOnly: boolean; bridgedAdapters: boolean; natAdapters: boolean; natNetworks: boolean; portForwarding: boolean; cloudAdapters: boolean; physicalDeviceTargets: boolean };
    resourceLimits: { maxNodes: number; maxLinks: number; maxConfigurationBytes: number; maxEvidenceBytes: number };
  };
  topology: { nodes: NodeRecord[]; links: LinkRecord[] };
  configurationCandidates: Array<{ nodeId: string; label: string; content: string }>;
  validationPlan: Array<{ id: string; title: string; kind: "reachability" | "routing" | "interface_state" | "policy"; expected: string }>;
  rollbackPlan: string;
};

export type SignedRunnerManifest = { payload: ManifestPayload; signature: string };
export type DryRunPlan = {
  manifestId: string;
  mode: "dry_run";
  isolation: "internal_network_only";
  steps: string[];
  cleanup: string[];
  validationAssertions: number;
};

export type DryRunEvidence = {
  manifestId: string;
  verdict: "inconclusive";
  summary: string;
  assertionResults: Array<{ assertionId: string; status: "not_run"; note: string }>;
  redactedNotes: string[];
  evidenceDigest: string;
};

export type VirtualBoxCommandPlan = {
  mode: "not_run";
  manifestId: string;
  commands: Array<{ binary: "VBoxManage"; args: string[]; purpose: string }>;
  excludedCapabilities: Array<"bridged_adapter" | "nat_adapter" | "nat_network" | "port_forward" | "cloud_adapter" | "physical_target" | "shell">;
};

export function canonicalManifestPayload(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalManifestPayload).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalManifestPayload(record[key])}`).join(",")}}`;
}

function reject(message: string): never {
  throw new Error(`Runner rejected manifest: ${message}`);
}

function requiresExactIsolationPolicy(payload: ManifestPayload) {
  const policy = payload.runner.networkPolicy;
  if (!policy.internalNetworkOnly || policy.bridgedAdapters || policy.natAdapters || policy.natNetworks || policy.portForwarding || policy.cloudAdapters || policy.physicalDeviceTargets) {
    reject("the manifest requests a prohibited network capability");
  }
}

function validatePayload(payload: ManifestPayload, now: Date) {
  if (payload.version !== 1 || payload.runner.platform !== "linux_virtualbox") reject("the platform is unsupported");
  if (!Number.isFinite(Date.parse(payload.expiresAt)) || Date.parse(payload.expiresAt) <= now.getTime()) reject("the manifest is expired");
  requiresExactIsolationPolicy(payload);
  if (payload.runner.allowedOperations.length !== REQUIRED_OPERATIONS.length || !REQUIRED_OPERATIONS.every(operation => payload.runner.allowedOperations.includes(operation))) reject("the operation allow-list differs from the required policy");
  const { nodes, links } = payload.topology;
  if (nodes.length === 0 || nodes.length > payload.runner.resourceLimits.maxNodes || links.length > payload.runner.resourceLimits.maxLinks) reject("the topology exceeds its resource limits");
  const nodeIds = new Set(nodes.map(node => node.id));
  if (nodeIds.size !== nodes.length || nodes.some(node => !/^[a-zA-Z0-9._-]{1,80}$/.test(node.imageAlias))) reject("node aliases are invalid");
  if (links.some(link => !nodeIds.has(link.sourceNodeId) || !nodeIds.has(link.targetNodeId) || link.sourceNodeId === link.targetNodeId)) reject("a topology link is invalid");
  const configurationBytes = Buffer.byteLength(payload.configurationCandidates.map(candidate => candidate.content).join("\n"), "utf8");
  if (configurationBytes > payload.runner.resourceLimits.maxConfigurationBytes || payload.configurationCandidates.some(candidate => !nodeIds.has(candidate.nodeId) || BLOCKED_TERMS.test(candidate.content))) reject("configuration content is unsafe or out of bounds");
  if (payload.validationPlan.some(assertion => BLOCKED_TERMS.test(`${assertion.title}\n${assertion.expected}`))) reject("a validation assertion is unsafe");
}

export function buildDryRunPlan(manifest: SignedRunnerManifest, publicKey: string, now = new Date()): DryRunPlan {
  let signatureIsValid = false;
  try {
    signatureIsValid = verify(null, Buffer.from(canonicalManifestPayload(manifest.payload), "utf8"), publicKey, Buffer.from(manifest.signature, "base64url"));
  } catch {
    reject("the signature is malformed");
  }
  if (!signatureIsValid) reject("the signature is invalid");
  validatePayload(manifest.payload, now);
  return {
    manifestId: manifest.payload.manifestId,
    mode: "dry_run",
    isolation: "internal_network_only",
    steps: ["Verify approved image aliases locally.", "Plan internal-only topology links.", "Review deterministic configuration candidates.", "Review allow-listed validation assertions."],
    cleanup: ["Plan removal of the isolated topology.", "Plan local evidence redaction and digest generation."],
    validationAssertions: manifest.payload.validationPlan.length,
  };
}

function commandSafeToken(value: string, label: string): string {
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(value)) reject(`${label} contains an unsafe command token`);
  return value;
}

/**
 * Produces structured argv records for engineer review. This function does not
 * import child_process, invoke VBoxManage, or format a shell command.
 */
export function buildVirtualBoxCommandPlan(manifest: SignedRunnerManifest, publicKey: string, now = new Date()): VirtualBoxCommandPlan {
  const dryRun = buildDryRunPlan(manifest, publicKey, now);
  const prefix = `synthia-${commandSafeToken(dryRun.manifestId, "manifest ID").slice(0, 28)}`;
  const commands: VirtualBoxCommandPlan["commands"] = [];
  for (const node of manifest.payload.topology.nodes) {
    const name = `${prefix}-${commandSafeToken(node.id, "node ID")}`;
    commands.push({ binary: "VBoxManage", args: ["createvm", "--name", name, "--register"], purpose: `Create isolated VM shell for ${node.label}.` });
  }
  const linkIndexByNode = new Map<string, number>();
  for (const link of manifest.payload.topology.links) {
    const segment = `${prefix}-${commandSafeToken(link.id, "link ID")}`;
    for (const nodeId of [link.sourceNodeId, link.targetNodeId]) {
      const adapterIndex = (linkIndexByNode.get(nodeId) ?? 0) + 1;
      linkIndexByNode.set(nodeId, adapterIndex);
      const vmName = `${prefix}-${commandSafeToken(nodeId, "node ID")}`;
      commands.push({ binary: "VBoxManage", args: ["modifyvm", vmName, `--nic${adapterIndex}`, "intnet", `--intnet${adapterIndex}`, segment, `--cableconnected${adapterIndex}`, "on"], purpose: `Attach ${nodeId} to sealed internal segment ${link.id}.` });
    }
  }
  return { mode: "not_run", manifestId: dryRun.manifestId, commands, excludedCapabilities: ["bridged_adapter", "nat_adapter", "nat_network", "port_forward", "cloud_adapter", "physical_target", "shell"] };
}

/** Produces reviewable dry-run evidence only; no validation assertion is executed. */
export function createDryRunEvidence(plan: DryRunPlan, manifest: SignedRunnerManifest, notes: string[] = []): DryRunEvidence {
  const redactedNotes = notes
    .slice(0, 20)
    .map(note => note.slice(0, 500).replace(/(password|private[ _-]?key|api[ _-]?key|token|snmp\s+community)\s*[:=]\s*\S+/gi, "$1=[REDACTED]"));
  const assertionResults = manifest.payload.validationPlan.map(assertion => ({ assertionId: assertion.id, status: "not_run" as const, note: "Dry-run only; no assertion was executed." }));
  const evidenceDigest = createHash("sha256").update(canonicalManifestPayload({ manifestId: plan.manifestId, redactedNotes, assertionResults })).digest("hex");
  return { manifestId: plan.manifestId, verdict: "inconclusive", summary: "Dry-run plan verified. No VirtualBox command, image operation, or validation assertion was executed.", assertionResults, redactedNotes, evidenceDigest };
}

async function main(argv: string[]) {
  const manifestPath = argv[argv.indexOf("--manifest") + 1];
  const publicKeyPath = argv[argv.indexOf("--public-key") + 1];
  if (!argv.includes("--confirm-dry-run") || !manifestPath || !publicKeyPath) {
    throw new Error("Usage: synthia-network-lab-runner --manifest <file> --public-key <file> --confirm-dry-run");
  }
  const [manifestFile, publicKey] = await Promise.all([readFile(manifestPath, "utf8"), readFile(publicKeyPath, "utf8")]);
  const plan = buildDryRunPlan(JSON.parse(manifestFile) as SignedRunnerManifest, publicKey);
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : "Runner dry-run failed."}\n`);
    process.exitCode = 1;
  });
}
