/**
 * Local-lab manifest contract. Owns short-lived integrity checks and restrictive
 * runner policy; it defines control-plane data only and performs no lab execution.
 */
import { randomUUID, sign, verify } from "node:crypto";
import { ENV } from "./_core/env";
import type { NetworkLabConfigurationCandidate, NetworkLabTopology, NetworkLabValidationAssertion } from "./networkLabs";

export const NETWORK_LAB_MANIFEST_TTL_MS = 10 * 60_000;

export type NetworkLabManifestPayload = {
  version: 1;
  manifestId: string;
  labId: string;
  approvalId: string;
  ownerId: number;
  issuedAt: string;
  expiresAt: string;
  runner: {
    platform: "linux_virtualbox";
    allowedOperations: Array<"preflight" | "resolve_image_alias" | "prepare_internal_topology" | "apply_candidate_config" | "run_validation" | "collect_bounded_evidence" | "cleanup">;
    networkPolicy: { internalNetworkOnly: true; bridgedAdapters: false; natAdapters: false; natNetworks: false; portForwarding: false; cloudAdapters: false; physicalDeviceTargets: false };
    resourceLimits: { maxNodes: 24; maxLinks: 48; maxConfigurationBytes: 192_000; maxEvidenceBytes: 1_048_576 };
  };
  topology: NetworkLabTopology;
  configurationCandidates: NetworkLabConfigurationCandidate[];
  validationPlan: NetworkLabValidationAssertion[];
  rollbackPlan: string;
};

export type SignedNetworkLabManifest = { payload: NetworkLabManifestPayload; signature: string };

function payloadBytes(payload: NetworkLabManifestPayload) {
  const serialize = (value: unknown): string => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(serialize).join(",")}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${serialize(record[key])}`).join(",")}}`;
  };
  return Buffer.from(serialize(payload), "utf8");
}

function signatureFor(payload: NetworkLabManifestPayload, privateKey: string) {
  return sign(null, payloadBytes(payload), privateKey).toString("base64url");
}

export function issueNetworkLabManifest(input: {
  labId: string;
  approvalId: string;
  ownerId: number;
  topology: NetworkLabTopology;
  configurationCandidates: NetworkLabConfigurationCandidate[];
  validationPlan: NetworkLabValidationAssertion[];
  rollbackPlan: string;
  now?: Date;
  privateKey?: string;
}): SignedNetworkLabManifest {
  const privateKey = input.privateKey ?? ENV.networkLabManifestPrivateKey;
  if (!privateKey) throw new Error("Network lab manifest signing is unavailable.");
  const now = input.now ?? new Date();
  const payload: NetworkLabManifestPayload = {
    version: 1,
    manifestId: randomUUID(),
    labId: input.labId,
    approvalId: input.approvalId,
    ownerId: input.ownerId,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + NETWORK_LAB_MANIFEST_TTL_MS).toISOString(),
    runner: {
      platform: "linux_virtualbox",
      allowedOperations: ["preflight", "resolve_image_alias", "prepare_internal_topology", "apply_candidate_config", "run_validation", "collect_bounded_evidence", "cleanup"],
      networkPolicy: { internalNetworkOnly: true, bridgedAdapters: false, natAdapters: false, natNetworks: false, portForwarding: false, cloudAdapters: false, physicalDeviceTargets: false },
      resourceLimits: { maxNodes: 24, maxLinks: 48, maxConfigurationBytes: 192_000, maxEvidenceBytes: 1_048_576 },
    },
    topology: input.topology,
    configurationCandidates: input.configurationCandidates,
    validationPlan: input.validationPlan,
    rollbackPlan: input.rollbackPlan,
  };
  return { payload, signature: signatureFor(payload, privateKey) };
}

/**
 * A local runner may verify integrity and expiry before it considers the
 * allow-listed manifest. Verification does not execute any operation.
 */
export function verifyNetworkLabManifest(input: SignedNetworkLabManifest, options?: { now?: Date; publicKey?: string }) {
  const publicKey = options?.publicKey;
  if (!publicKey) return false;
  let signatureIsValid = false;
  try {
    signatureIsValid = verify(null, payloadBytes(input.payload), publicKey, Buffer.from(input.signature, "base64url"));
  } catch {
    return false;
  }
  if (!signatureIsValid) return false;
  const expiresAt = Date.parse(input.payload.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > (options?.now ?? new Date()).getTime();
}
