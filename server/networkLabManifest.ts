import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
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

function signingKey(secret: string) {
  return createHash("sha256").update(`synthia-network-lab-manifest-v1:${secret}`).digest();
}

function payloadBytes(payload: NetworkLabManifestPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8");
}

function signatureFor(payload: NetworkLabManifestPayload, secret: string) {
  return createHmac("sha256", signingKey(secret)).update(payloadBytes(payload)).digest("base64url");
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
  secret?: string;
}): SignedNetworkLabManifest {
  const secret = input.secret ?? ENV.cookieSecret;
  if (!secret) throw new Error("Network lab manifest signing is unavailable.");
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
  return { payload, signature: signatureFor(payload, secret) };
}

/**
 * A local runner may verify integrity and expiry before it considers the
 * allow-listed manifest. Verification does not execute any operation.
 */
export function verifyNetworkLabManifest(input: SignedNetworkLabManifest, options?: { now?: Date; secret?: string }) {
  const secret = options?.secret ?? ENV.cookieSecret;
  if (!secret) return false;
  const expected = Buffer.from(signatureFor(input.payload, secret));
  const supplied = Buffer.from(input.signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  const expiresAt = Date.parse(input.payload.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > (options?.now ?? new Date()).getTime();
}
