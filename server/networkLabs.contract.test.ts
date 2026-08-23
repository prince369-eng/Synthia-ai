import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { issueNetworkLabManifest, verifyNetworkLabManifest } from "./networkLabManifest";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("Network Lab Workspace contracts", () => {
  it("keeps topology, approval, and evidence records owner-scoped in the schema", () => {
    const schema = read("drizzle/schema.ts");

    expect(schema).toContain('export const networkLabs = pgTable("network_labs"');
    expect(schema).toContain('export const networkLabApprovals = pgTable("network_lab_approvals"');
    expect(schema).toContain('export const networkLabEvidence = pgTable("network_lab_evidence"');
    expect(schema).toContain('index("network_labs_user_status_updated_idx").on(table.userId, table.status, table.updatedAt)');
    expect(schema).toContain('uniqueIndex("network_lab_approvals_lab_revision_unique").on(table.labId, table.revision)');
  });

  it("requires protected procedures, bounded schemas, and a one-time approval transition", () => {
    const routers = read("server/routers.ts");
    const helpers = read("server/networkLabs.ts");

    expect(routers).toContain("networkLabs: router({");
    expect(routers).toContain("create: protectedProcedure.input(networkLabCreateSchema)");
    expect(routers).toContain("submitForReview: protectedProcedure.input(networkLabIdSchema)");
    expect(routers).toContain("decideApproval: protectedProcedure.input(networkLabApprovalSchema)");
    expect(routers).toContain("Configurations must not contain credentials or private-key material.");
    expect(routers).toContain("A link must join two distinct nodes.");
    expect(helpers).toContain('eq(networkLabApprovals.decision, "pending")');
    expect(helpers).toContain("does not dispatch a runner, start a VM, or grant device access");
  });

  it("does not import VM, child-process, or network-execution APIs into the control plane", () => {
    const helpers = read("server/networkLabs.ts");
    const page = read("client/src/pages/NetworkLabs.tsx");

    expect(helpers).not.toMatch(/child_process|VBoxManage|spawn\(|exec\(/i);
    expect(helpers).toContain('runnerPlatform: "linux_virtualbox"');
    expect(page).toContain("Saving a proposal never starts a local lab.");
    expect(page).toContain("Starting a virtual lab remains a separate local action by the engineer.");
  });

  it("signs an expiring internal-only runner contract and rejects alteration", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");
    const manifest = issueNetworkLabManifest({
      labId: "11111111-1111-4111-8111-111111111111",
      approvalId: "22222222-2222-4222-8222-222222222222",
      ownerId: 42,
      topology: { nodes: [], links: [] },
      configurationCandidates: [],
      validationPlan: [],
      rollbackPlan: "Remove the isolated local resources after validation.",
      now,
      secret: "test-only-manifest-secret",
    });

    expect(manifest.payload.runner.platform).toBe("linux_virtualbox");
    expect(manifest.payload.runner.networkPolicy).toEqual({
      internalNetworkOnly: true,
      bridgedAdapters: false,
      natAdapters: false,
      natNetworks: false,
      portForwarding: false,
      cloudAdapters: false,
      physicalDeviceTargets: false,
    });
    expect(verifyNetworkLabManifest(manifest, { now, secret: "test-only-manifest-secret" })).toBe(true);
    expect(verifyNetworkLabManifest({ ...manifest, payload: { ...manifest.payload, ownerId: 43 } }, { now, secret: "test-only-manifest-secret" })).toBe(false);
    expect(verifyNetworkLabManifest(manifest, { now: new Date("2026-08-23T00:10:00.001Z"), secret: "test-only-manifest-secret" })).toBe(false);
  });
});
