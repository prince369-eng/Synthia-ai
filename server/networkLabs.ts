import { and, desc, eq, isNull } from "drizzle-orm";
/**
 * Network Lab control-plane persistence. Owns proposals, approvals, one-time
 * manifests, and bounded evidence; it never starts VMs, imports images, or contacts devices.
 */
import { createHash, randomUUID } from "node:crypto";
import { getDb } from "./db";
import { networkLabApprovals, networkLabEvidence, networkLabManifests, networkLabs } from "../drizzle/schema";

export type NetworkLabNode = {
  id: string;
  label: string;
  vendorFamily: "cisco" | "juniper" | "arista";
  imageAlias: string;
  role: "router" | "switch" | "firewall" | "host";
};

export type NetworkLabLink = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;
  targetPort: string;
};

export type NetworkLabTopology = { nodes: NetworkLabNode[]; links: NetworkLabLink[] };
export type NetworkLabConfigurationCandidate = { nodeId: string; label: string; content: string };
export type NetworkLabValidationAssertion = { id: string; title: string; kind: "reachability" | "routing" | "interface_state" | "policy"; expected: string };

function requireDatabase<T>(database: T | null): T {
  if (!database) throw new Error("The application database is unavailable.");
  return database;
}

export type CreateNetworkLabInput = {
  userId: number;
  title: string;
  objective: string;
  vendorFamilies: Array<"cisco" | "juniper" | "arista">;
  topology: NetworkLabTopology;
  configurationCandidates: NetworkLabConfigurationCandidate[];
  validationPlan: NetworkLabValidationAssertion[];
  rollbackPlan: string;
};

/**
 * Persists a proposal and creates its first pending owner-approval record. It
 * does not create a VM, import an image, produce a manifest, or contact a lab.
 */
export async function createNetworkLabForUser(input: CreateNetworkLabInput) {
  const database = requireDatabase(await getDb());
  const labId = randomUUID();
  const approvalId = randomUUID();
  const now = new Date();
  return database.transaction(async transaction => {
    const [lab] = await transaction.insert(networkLabs).values({
      id: labId,
      userId: input.userId,
      title: input.title,
      objective: input.objective,
      vendorFamilies: input.vendorFamilies,
      topology: input.topology,
      configurationCandidates: input.configurationCandidates,
      validationPlan: input.validationPlan,
      rollbackPlan: input.rollbackPlan,
      runnerPlatform: "linux_virtualbox",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    }).returning();
    if (!lab) throw new Error("The network lab could not be created.");
    const [approval] = await transaction.insert(networkLabApprovals).values({
      id: approvalId,
      labId,
      userId: input.userId,
      decision: "pending",
      revision: 1,
      createdAt: now,
    }).returning();
    if (!approval) throw new Error("The network lab review could not be created.");
    return { lab, approval };
  });
}

export async function listNetworkLabsForUser(userId: number) {
  const database = requireDatabase(await getDb());
  return database.select().from(networkLabs)
    .where(eq(networkLabs.userId, userId))
    .orderBy(desc(networkLabs.updatedAt));
}

export async function getNetworkLabForUser(labId: string, userId: number) {
  const database = requireDatabase(await getDb());
  const [lab] = await database.select().from(networkLabs)
    .where(and(eq(networkLabs.id, labId), eq(networkLabs.userId, userId)))
    .limit(1);
  if (!lab) return undefined;
  const [approvals, evidence] = await Promise.all([
    database.select().from(networkLabApprovals)
      .where(and(eq(networkLabApprovals.labId, labId), eq(networkLabApprovals.userId, userId)))
      .orderBy(desc(networkLabApprovals.revision)),
    database.select().from(networkLabEvidence)
      .where(and(eq(networkLabEvidence.labId, labId), eq(networkLabEvidence.userId, userId)))
      .orderBy(desc(networkLabEvidence.createdAt)),
  ]);
  return { lab, approvals, evidence };
}

export async function submitNetworkLabForReview(labId: string, userId: number) {
  const database = requireDatabase(await getDb());
  const [updated] = await database.update(networkLabs)
    .set({ status: "ready_for_review", updatedAt: new Date() })
    .where(and(eq(networkLabs.id, labId), eq(networkLabs.userId, userId), eq(networkLabs.status, "draft")))
    .returning();
  if (!updated) throw new Error("The network lab is not available for review.");
  return updated;
}

/**
 * Transitions a pending approval once. This remains a review record only: an
 * approved result does not dispatch a runner, start a VM, or grant device access.
 */
export async function decideNetworkLabApproval(input: {
  userId: number;
  labId: string;
  approvalId: string;
  decision: "approved" | "rejected";
  reviewNote?: string;
}) {
  const database = requireDatabase(await getDb());
  return database.transaction(async transaction => {
    const [approval] = await transaction.update(networkLabApprovals)
      .set({ decision: input.decision, reviewNote: input.reviewNote, decidedAt: new Date() })
      .where(and(
        eq(networkLabApprovals.id, input.approvalId),
        eq(networkLabApprovals.labId, input.labId),
        eq(networkLabApprovals.userId, input.userId),
        eq(networkLabApprovals.decision, "pending"),
      ))
      .returning();
    if (!approval) throw new Error("This network-lab review has already been decided or is unavailable.");
    const nextStatus = input.decision === "approved" ? "approved" : "draft";
    const [lab] = await transaction.update(networkLabs)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(networkLabs.id, input.labId), eq(networkLabs.userId, input.userId)))
      .returning();
    if (!lab) throw new Error("The network lab is unavailable.");
    return { lab, approval };
  });
}

export async function recordNetworkLabManifest(input: {
  manifestId: string;
  labId: string;
  approvalId: string;
  userId: number;
  signature: string;
  expiresAt: Date;
}) {
  const database = requireDatabase(await getDb());
  const [manifest] = await database.insert(networkLabManifests).values({
    id: input.manifestId,
    labId: input.labId,
    approvalId: input.approvalId,
    userId: input.userId,
    signatureDigest: createHash("sha256").update(input.signature).digest("hex"),
    expiresAt: input.expiresAt,
  }).returning();
  if (!manifest) throw new Error("The network lab manifest could not be recorded.");
  return manifest;
}

export type NetworkLabEvidenceInput = {
  userId: number;
  labId: string;
  manifestId: string;
  signature: string;
  verdict: "passed" | "failed" | "inconclusive";
  summary: string;
  assertionResults: Array<{ assertionId: string; status: "passed" | "failed" | "not_run"; note?: string }>;
  artifactDigests: string[];
  runnerAttestation: string;
};

/**
 * Atomically consumes one valid local-runner manifest and stores only bounded,
 * redacted summary evidence. It neither invokes a runner nor receives device
 * output, configuration files, vendor images, or arbitrary artifacts.
 */
export async function consumeNetworkLabManifestAndRecordEvidence(input: NetworkLabEvidenceInput) {
  const database = requireDatabase(await getDb());
  const now = new Date();
  const signatureDigest = createHash("sha256").update(input.signature).digest("hex");
  return database.transaction(async transaction => {
    const [manifest] = await transaction.select().from(networkLabManifests).where(and(
      eq(networkLabManifests.id, input.manifestId),
      eq(networkLabManifests.labId, input.labId),
      eq(networkLabManifests.userId, input.userId),
    )).limit(1);
    if (!manifest || manifest.signatureDigest !== signatureDigest || manifest.expiresAt.getTime() <= now.getTime() || manifest.consumedAt) {
      throw new Error("The local-runner manifest is invalid, expired, or already used.");
    }
    const [consumed] = await transaction.update(networkLabManifests).set({ consumedAt: now })
      .where(and(eq(networkLabManifests.id, input.manifestId), eq(networkLabManifests.userId, input.userId), eq(networkLabManifests.signatureDigest, signatureDigest), isNull(networkLabManifests.consumedAt)))
      .returning();
    if (!consumed || consumed.consumedAt?.getTime() !== now.getTime()) throw new Error("The local-runner manifest is no longer available.");
    const [evidence] = await transaction.insert(networkLabEvidence).values({
      id: randomUUID(),
      labId: input.labId,
      manifestId: input.manifestId,
      userId: input.userId,
      verdict: input.verdict === "passed" ? "pass" : input.verdict === "failed" ? "fail" : "inconclusive",
      summary: input.summary,
      assertionResults: input.assertionResults,
      artifactDigests: input.artifactDigests,
      runnerAttestation: input.runnerAttestation,
      createdAt: now,
    }).returning();
    if (!evidence) throw new Error("The validation evidence could not be recorded.");
    const nextStatus = input.verdict === "passed" ? "validation_passed" : input.verdict === "failed" ? "validation_failed" : "incomplete";
    await transaction.update(networkLabs).set({ status: nextStatus, updatedAt: now })
      .where(and(eq(networkLabs.id, input.labId), eq(networkLabs.userId, input.userId)));
    return evidence;
  });
}
