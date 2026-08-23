import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDryRunPlan, canonicalManifestPayload, createDryRunEvidence, type SignedRunnerManifest } from "./synthia-network-lab-runner";

function signedFixture(): { manifest: SignedRunnerManifest; publicKey: string } {
  const pair = generateKeyPairSync("ed25519");
  const payload: SignedRunnerManifest["payload"] = {
    version: 1, manifestId: "runner-test", labId: "lab-test", approvalId: "approval-test", ownerId: 1,
    issuedAt: "2026-08-23T00:00:00.000Z", expiresAt: "2026-08-23T00:10:00.000Z",
    runner: { platform: "linux_virtualbox", allowedOperations: ["preflight", "resolve_image_alias", "prepare_internal_topology", "apply_candidate_config", "run_validation", "collect_bounded_evidence", "cleanup"], networkPolicy: { internalNetworkOnly: true, bridgedAdapters: false, natAdapters: false, natNetworks: false, portForwarding: false, cloudAdapters: false, physicalDeviceTargets: false }, resourceLimits: { maxNodes: 24, maxLinks: 48, maxConfigurationBytes: 192_000, maxEvidenceBytes: 1_048_576 } },
    topology: { nodes: [{ id: "r1", label: "Router 1", vendorFamily: "juniper", imageAlias: "vjunos-router", role: "router" }], links: [] },
    configurationCandidates: [{ nodeId: "r1", label: "base routing", content: "set system host-name r1" }], validationPlan: [{ id: "assert-1", title: "Interface state", kind: "interface_state", expected: "up" }], rollbackPlan: "Remove isolated resources.",
  };
  return { manifest: { payload, signature: sign(null, Buffer.from(canonicalManifestPayload(payload), "utf8"), pair.privateKey).toString("base64url") }, publicKey: pair.publicKey.export({ type: "spki", format: "pem" }).toString() };
}

describe("local Network Lab dry-run runner", () => {
  it("only produces an internal-network dry-run plan for a valid signed manifest", () => {
    const { manifest, publicKey } = signedFixture();
    expect(buildDryRunPlan(manifest, publicKey, new Date("2026-08-23T00:01:00.000Z"))).toMatchObject({ mode: "dry_run", isolation: "internal_network_only", validationAssertions: 1 });
  });

  it("rejects tampered or unsafe manifests before creating a plan", () => {
    const { manifest, publicKey } = signedFixture();
    expect(() => buildDryRunPlan({ ...manifest, payload: { ...manifest.payload, ownerId: 2 } }, publicKey, new Date("2026-08-23T00:01:00.000Z"))).toThrow("signature is invalid");
  });

  it("produces bounded, redacted evidence without claiming validation occurred", () => {
    const { manifest, publicKey } = signedFixture();
    const plan = buildDryRunPlan(manifest, publicKey, new Date("2026-08-23T00:01:00.000Z"));
    const evidence = createDryRunEvidence(plan, manifest, ["api_key=do-not-retain", "Topology reviewed"]);
    expect(evidence).toMatchObject({ verdict: "inconclusive", assertionResults: [{ assertionId: "assert-1", status: "not_run" }] });
    expect(evidence.redactedNotes.join(" ")).not.toContain("do-not-retain");
    expect(evidence.evidenceDigest).toMatch(/^[a-f0-9]{64}$/);
  });
});
