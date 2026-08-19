import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import * as schema from "../drizzle/schema";
import {
  approvalRequests,
  deliverables,
  InsertUser,
  integrations,
  memoryFacts,
  projects,
  sandboxes,
  taskEvents,
  taskEventSequences,
  taskMessages,
  tasks,
  type Project,
  type Task,
  type User,
  usageEvents,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { publishTaskEvent } from "./realtime/taskEventBus";

export type TaskPlanStep = {
  id: string;
  title: string;
  state: "pending" | "active" | "done" | "blocked";
};

export type TaskPlan = TaskPlanStep[];

export type AutonomySettings = {
  mode: "ask_before_risky" | "supervised";
  allowWebSearch: boolean;
  allowCodeExecution: boolean;
  allowFileWrites: boolean;
};

export const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
  mode: "ask_before_risky",
  allowWebSearch: true,
  allowCodeExecution: true,
  allowFileWrites: true,
};

type TaskEventInput = {
  type: typeof taskEvents.$inferInsert.type;
  payload: Record<string, unknown>;
};

type Database = NodePgDatabase<typeof schema>;
type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

let client: Database | null = null;

export async function getDb() {
  if (!client && ENV.postgresUrl) {
    client = drizzle(ENV.postgresUrl);
  }
  return client;
}

function databaseRequired<T>(database: T | null): T {
  if (!database) {
    throw new Error("The application database is unavailable.");
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert.");
  }

  const database = databaseRequired(await getDb());
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Partial<InsertUser> = { lastSignedIn: new Date() };

  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await database.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const database = databaseRequired(await getDb());
  const result = await database.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(userId: number): Promise<User | undefined> {
  const database = databaseRequired(await getDb());
  const result = await database.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function listTasksForUser(userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.isPinned), desc(tasks.updatedAt));
}

export async function listProjectsForUser(userId: number): Promise<Project[]> {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectForUser(projectId: string, userId: number): Promise<Project | undefined> {
  const database = databaseRequired(await getDb());
  const rows = await database
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function createProjectForUser(input: {
  userId: number;
  name: string;
  description?: string;
}): Promise<Project> {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  const [project] = await database
    .insert(projects)
    .values({
      id,
      userId: input.userId,
      name: input.name,
      description: input.description,
    })
    .returning();
  if (!project) throw new Error("The project could not be created.");
  return project;
}

export async function getTaskForUser(taskId: string, userId: number): Promise<Task | undefined> {
  const database = databaseRequired(await getDb());
  const result = await database
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getTaskById(taskId: string): Promise<Task | undefined> {
  const database = databaseRequired(await getDb());
  const result = await database.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return result[0];
}

export async function createTaskForUser(input: {
  userId: number;
  projectId?: string;
  title: string;
  goal: string;
  plan: TaskPlan;
  autonomySettings: AutonomySettings;
  involvesCode: boolean;
  estimateBand: "quick" | "standard" | "extensive";
  estimatedCreditsMin: number;
  estimatedCreditsMax: number;
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  await database.transaction(async transaction => {
    await transaction.insert(tasks).values({
      id,
      userId: input.userId,
      projectId: input.projectId,
      title: input.title,
      goal: input.goal,
      plan: input.plan,
      autonomySettings: input.autonomySettings,
      involvesCode: input.involvesCode,
      estimateBand: input.estimateBand,
      estimatedCreditsMin: input.estimatedCreditsMin,
      estimatedCreditsMax: input.estimatedCreditsMax,
    });
    await transaction.insert(taskEventSequences).values({ taskId: id });
    await appendTaskEventInTransaction(transaction, id, {
      type: "user_message",
      payload: { content: input.goal },
    });
    await transaction.insert(taskMessages).values({
      id: randomUUID(),
      taskId: id,
      role: "user",
      content: input.goal,
    });
    await appendTaskEventInTransaction(transaction, id, {
      type: "status_change",
      payload: { status: "queued", summary: "Task queued for agent orchestration." },
    });
  });
  return getTaskForUser(id, input.userId);
}

async function appendTaskEventInTransaction(
  transaction: DatabaseTransaction,
  taskId: string,
  event: TaskEventInput,
) {
  const [sequenceRow] = await transaction
    .update(taskEventSequences)
    .set({ nextSequenceNumber: sql`${taskEventSequences.nextSequenceNumber} + 1`, updatedAt: new Date() })
    .where(eq(taskEventSequences.taskId, taskId))
    .returning({ sequenceNumber: taskEventSequences.nextSequenceNumber });
  if (!sequenceRow) throw new Error(`Task event sequence is missing for task ${taskId}.`);
  const sequenceNumber = sequenceRow.sequenceNumber;
  const id = randomUUID();
  await transaction.insert(taskEvents).values({
    id,
    taskId,
    sequenceNumber,
    type: event.type,
    payload: event.payload,
  });
  return { id, sequenceNumber };
}

export async function appendTaskEvent(taskId: string, event: TaskEventInput) {
  const database = databaseRequired(await getDb());
  const persisted = await database.transaction(transaction => appendTaskEventInTransaction(transaction, taskId, event));
  publishTaskEvent(taskId, persisted.sequenceNumber);
  return persisted;
}

export async function listTaskEvents(taskId: string) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(asc(taskEvents.sequenceNumber));
}

export async function listTaskEventsSince(taskId: string, sequenceNumber: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskEvents)
    .where(and(eq(taskEvents.taskId, taskId), gt(taskEvents.sequenceNumber, sequenceNumber)))
    .orderBy(asc(taskEvents.sequenceNumber))
    .limit(200);
}

export async function listTaskMessages(taskId: string) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskMessages)
    .where(eq(taskMessages.taskId, taskId))
    .orderBy(asc(taskMessages.createdAt));
}

export async function listTaskDeliverables(taskId: string) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(deliverables)
    .where(eq(deliverables.taskId, taskId))
    .orderBy(desc(deliverables.isFinal), desc(deliverables.createdAt));
}

export async function listLibraryDeliverablesForUser(userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select({
      id: deliverables.id,
      taskId: tasks.id,
      taskTitle: tasks.title,
      taskGoal: tasks.goal,
      taskStatus: tasks.status,
      filename: deliverables.filename,
      fileType: deliverables.fileType,
      isFinal: deliverables.isFinal,
      createdAt: deliverables.createdAt,
    })
    .from(deliverables)
    .innerJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(eq(tasks.userId, userId))
    .orderBy(desc(deliverables.isFinal), desc(deliverables.createdAt));
}

export async function listTaskApprovals(taskId: string) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.taskId, taskId))
    .orderBy(desc(approvalRequests.createdAt));
}

export async function listTaskSandboxes(taskId: string) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(sandboxes)
    .where(eq(sandboxes.taskId, taskId))
    .orderBy(desc(sandboxes.createdAt));
}

export async function getActiveSandboxForTask(taskId: string) {
  const database = databaseRequired(await getDb());
  const result = await database
    .select()
    .from(sandboxes)
    .where(and(eq(sandboxes.taskId, taskId), eq(sandboxes.status, "active")))
    .orderBy(desc(sandboxes.createdAt))
    .limit(1);
  return result[0];
}

export async function getRecoverableSandboxForTask(taskId: string) {
  const database = databaseRequired(await getDb());
  const result = await database
    .select()
    .from(sandboxes)
    .where(and(eq(sandboxes.taskId, taskId), sql`${sandboxes.status} in ('active', 'checkpointed')`))
    .orderBy(desc(sandboxes.createdAt))
    .limit(1);
  return result[0];
}

export async function updateTaskForUser(
  taskId: string,
  userId: number,
  update: Partial<Pick<Task, "status" | "currentStepSummary" | "isPinned" | "plan" | "completedAt" | "failedReason">>,
) {
  const database = databaseRequired(await getDb());
  await database.update(tasks).set(update).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  return getTaskForUser(taskId, userId);
}

export async function updateTaskForWorker(
  taskId: string,
  update: Partial<Pick<Task, "status" | "currentStepSummary" | "sandboxId" | "plan" | "completedAt" | "failedReason" | "startedAt" | "creditsConsumed">>,
) {
  const database = databaseRequired(await getDb());
  await database.update(tasks).set(update).where(eq(tasks.id, taskId));
  return getTaskById(taskId);
}

export async function createSandboxForTask(input: {
  taskId: string;
  provider: "docker" | "e2b";
  region: string;
  providerSandboxId: string;
  maxSessionSeconds: number;
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  await database.transaction(async transaction => {
    await transaction.insert(sandboxes).values({
      id,
      taskId: input.taskId,
      provider: input.provider,
      region: input.region,
      status: "active",
      providerSandboxId: input.providerSandboxId,
      maxSessionSeconds: input.maxSessionSeconds,
    });
    await transaction.update(tasks).set({ sandboxId: id }).where(eq(tasks.id, input.taskId));
  });
  return id;
}

export async function updateSandboxCheckpoint(sandboxId: string, checkpointRef: string) {
  const database = databaseRequired(await getDb());
  await database.update(sandboxes).set({ status: "checkpointed", checkpointRef }).where(eq(sandboxes.id, sandboxId));
}

export async function restoreSandboxForTask(sandboxId: string, providerSandboxId: string) {
  const database = databaseRequired(await getDb());
  await database.update(sandboxes).set({ status: "active", providerSandboxId }).where(eq(sandboxes.id, sandboxId));
}

export async function createApprovalForTask(input: {
  taskId: string;
  eventId: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  toolName: string;
  toolInput: Record<string, unknown>;
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  await database.insert(approvalRequests).values({ id, ...input, status: "pending" });
  return id;
}

export async function recordUsageForTask(input: {
  userId: number;
  taskId: string;
  creditsDelta: number;
  reason: string;
  metadata: Record<string, unknown>;
}) {
  const database = databaseRequired(await getDb());
  await database.transaction(async transaction => {
    await transaction.insert(usageEvents).values({ id: randomUUID(), ...input });
    await transaction
      .update(tasks)
      .set({ creditsConsumed: sql`${tasks.creditsConsumed} + ${input.creditsDelta}` })
      .where(eq(tasks.id, input.taskId));
    await transaction
      .update(users)
      .set({ creditsBalance: sql`${users.creditsBalance} - ${input.creditsDelta}` })
      .where(eq(users.id, input.userId));
  });
}

export async function recordUserMessage(taskId: string, content: string) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    const event = await appendTaskEventInTransaction(transaction, taskId, {
      type: "user_message",
      payload: { content },
    });
    await transaction.insert(taskMessages).values({
      id: randomUUID(),
      taskId,
      role: "user",
      content,
      eventId: event.id,
    });
    return event;
  });
}

export async function recordAgentMessage(taskId: string, content: string) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    const event = await appendTaskEventInTransaction(transaction, taskId, {
      type: "agent_message",
      payload: { content },
    });
    await transaction.insert(taskMessages).values({
      id: randomUUID(),
      taskId,
      role: "agent",
      content,
      eventId: event.id,
    });
    return event;
  });
}

export async function resolveApprovalForTask(input: {
  taskId: string;
  approvalId: string;
  decision: "approved" | "rejected" | "edited";
  resolvedInput?: Record<string, unknown>;
}) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    const [approval] = await transaction
      .select()
      .from(approvalRequests)
      .where(and(eq(approvalRequests.id, input.approvalId), eq(approvalRequests.taskId, input.taskId)))
      .limit(1);
    if (!approval || approval.status !== "pending") {
      throw new Error("The approval request is no longer pending.");
    }
    await transaction
      .update(approvalRequests)
      .set({ status: input.decision, resolvedInput: input.resolvedInput, resolvedAt: new Date() })
      .where(eq(approvalRequests.id, input.approvalId));
    return appendTaskEventInTransaction(transaction, input.taskId, {
      type: "approval_response",
      payload: { approvalId: input.approvalId, decision: input.decision },
    });
  });
}

export async function listMemoryFacts(userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(memoryFacts)
    .where(and(eq(memoryFacts.userId, userId), eq(memoryFacts.status, "active")))
    .orderBy(desc(memoryFacts.lastUsedAt), desc(memoryFacts.createdAt));
}

export async function listIntegrationsForUser(userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select({
      id: integrations.id,
      provider: integrations.provider,
      label: integrations.label,
      scopes: integrations.scopes,
      availableToAllTasks: integrations.availableToAllTasks,
      expiresAt: integrations.expiresAt,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .where(eq(integrations.userId, userId))
    .orderBy(asc(integrations.provider), asc(integrations.label));
}

export async function getUsageSummary(userId: number) {
  const database = databaseRequired(await getDb());
  const [user] = await database
    .select({ creditsBalance: users.creditsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [usage] = await database
    .select({ creditsConsumed: sql<number>`coalesce(sum(${usageEvents.creditsDelta}), 0)` })
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId));
  const [taskTotal] = await database
    .select({ taskCount: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.userId, userId));
  const recentEvents = await database
    .select({
      id: usageEvents.id,
      taskId: usageEvents.taskId,
      taskTitle: tasks.title,
      creditsDelta: usageEvents.creditsDelta,
      reason: usageEvents.reason,
      createdAt: usageEvents.createdAt,
    })
    .from(usageEvents)
    .leftJoin(tasks, eq(usageEvents.taskId, tasks.id))
    .where(eq(usageEvents.userId, userId))
    .orderBy(desc(usageEvents.createdAt))
    .limit(8);
  return {
    creditsBalance: user?.creditsBalance ?? 0,
    creditsConsumed: usage?.creditsConsumed ?? 0,
    taskCount: Number(taskTotal?.taskCount ?? 0),
    recentEvents,
  };
}

export async function getUserPreferences(userId: number) {
  const database = databaseRequired(await getDb());
  const [user] = await database
    .select({ preferences: users.preferences, hasCompletedOnboarding: users.hasCompletedOnboarding })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? { preferences: null, hasCompletedOnboarding: false };
}

export async function updateUserPreferences(userId: number, preferences: Record<string, unknown>) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    const [current] = await transaction
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const currentPreferences = current?.preferences && typeof current.preferences === "object" && !Array.isArray(current.preferences)
      ? current.preferences as Record<string, unknown>
      : {};
    const mergedPreferences = { ...currentPreferences, ...preferences };
    await transaction.update(users).set({ preferences: mergedPreferences }).where(eq(users.id, userId));
    return mergedPreferences;
  });
}

export async function completeOnboardingForUser(userId: number) {
  const database = databaseRequired(await getDb());
  await database.update(users).set({ hasCompletedOnboarding: true }).where(eq(users.id, userId));
  return getUserPreferences(userId);
}

export async function createDeliverable(input: {
  taskId: string;
  eventId?: string;
  filename: string;
  fileType: string;
  storageKey: string;
  storageUrl: string;
  thumbnailUrl?: string;
  isFinal: boolean;
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  await database.insert(deliverables).values({ id, ...input });
  return id;
}

export async function createIntegrationForUser(input: {
  userId: number;
  provider: string;
  label: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  scopes: string[];
  availableToAllTasks: boolean;
  expiresAt?: Date;
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  await database
    .insert(integrations)
    .values({ id, ...input })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider, integrations.label],
      set: {
        encryptedAccessToken: input.encryptedAccessToken,
        encryptedRefreshToken: input.encryptedRefreshToken,
        scopes: input.scopes,
        availableToAllTasks: input.availableToAllTasks,
        expiresAt: input.expiresAt,
        updatedAt: new Date(),
      },
    });
  return id;
}

export async function deleteIntegrationForUser(integrationId: string, userId: number) {
  const database = databaseRequired(await getDb());
  await database.delete(integrations).where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId)));
}

export async function createMemoryFact(input: {
  userId: number;
  factText: string;
  category: "preference" | "skill" | "project" | "tool_credential_hint" | "factual";
  sourceTaskId?: string;
  confidence: number;
  status: "pending" | "active";
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  await database.insert(memoryFacts).values({ id, ...input });
  return id;
}

export async function updateMemoryFactStatus(input: {
  memoryId: string;
  userId: number;
  status: "active" | "archived" | "user_deleted";
}) {
  const database = databaseRequired(await getDb());
  await database
    .update(memoryFacts)
    .set({ status: input.status })
    .where(and(eq(memoryFacts.id, input.memoryId), eq(memoryFacts.userId, input.userId)));
}
