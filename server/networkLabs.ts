import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { networkLabApprovals, networkLabEvidence, networkLabs } from "../drizzle/schema";

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
