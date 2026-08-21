import { and, asc, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import * as schema from "../drizzle/schema";
import type { AutomaticTaskRoute } from "@shared/automaticTaskRouting";
import {
  approvalRequests,
  deliverables,
  InsertUser,
  integrations,
  memoryFacts,
  personalityProfiles,
  personalizationMemories,
  projects,
  sandboxes,
  skillInstalls,
  skills,
  taskAttachments,
  taskEvents,
  taskEventSequences,
  taskMessages,
  taskSkillSelections,
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
  selectedModel?: { provider: "groq" | "agnes" | "aihubmix" | "openrouter" | "gemini" | "deepseek"; model: string };
  automaticRoute?: AutomaticTaskRoute;
};

export type TaskAttachmentInput = {
  filename: string;
  fileType: string;
  storageKey: string;
  storageUrl: string;
  sourceType: "upload" | "library";
  sourceDeliverableId?: string;
};

export const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
  mode: "ask_before_risky",
  allowWebSearch: true,
  allowCodeExecution: true,
  allowFileWrites: true,
};

export type PersonalityDimensions = {
  warmth: number;
  directness: number;
  detail: number;
  creativity: number;
  initiative: number;
};

export type SkillCategory = "document_style" | "coding_practice" | "domain_workflow" | "data_analysis" | "network_ops" | "security_research" | "other";
export type SkillVisibility = "private" | "workspace" | "public_platform";
export type SkillInstallScope = "personal" | "workspace";
export type SkillBundleFile = { key: string; filename: string; mimeType: string; bytes: number };
export type SkillCandidate = { id: string; name: string; description: string; skillMdContent: string };
export type TaskSkillSelection = { skillId: string; skillName: string; skillMdContent: string; relevanceScore: number; selectedAt: Date };

export const DEFAULT_PERSONALITY_DIMENSIONS: PersonalityDimensions = {
  warmth: 55,
  directness: 60,
  detail: 60,
  creativity: 50,
  initiative: 55,
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

export async function listTasksForUser(userId: number, includeArchived = false) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      ...(includeArchived ? [] : [eq(tasks.isArchived, false)]),
    ))
    .orderBy(desc(tasks.isPinned), desc(tasks.isFavorite), desc(tasks.updatedAt));
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
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
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
  attachments?: TaskAttachmentInput[];
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
    if (input.attachments?.length) {
      await transaction.insert(taskAttachments).values(input.attachments.map(attachment => ({
        id: randomUUID(),
        taskId: id,
        userId: input.userId,
        ...attachment,
      })));
      await appendTaskEventInTransaction(transaction, id, {
        type: "user_file_edit",
        payload: {
          attachments: input.attachments.map(attachment => ({
            filename: attachment.filename,
            fileType: attachment.fileType,
            sourceType: attachment.sourceType,
            sourceDeliverableId: attachment.sourceDeliverableId,
          })),
        },
      });
    }
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

export async function listTaskAttachments(taskId: string) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(asc(taskAttachments.createdAt));
}

export async function getLibraryDeliverableForUser(deliverableId: string, userId: number) {
  const database = databaseRequired(await getDb());
  const rows = await database
    .select({
      id: deliverables.id,
      filename: deliverables.filename,
      fileType: deliverables.fileType,
      storageKey: deliverables.storageKey,
      storageUrl: deliverables.storageUrl,
    })
    .from(deliverables)
    .innerJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(and(eq(deliverables.id, deliverableId), eq(tasks.userId, userId)))
    .limit(1);
  return rows[0];
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
  update: Partial<Pick<Task, "title" | "status" | "currentStepSummary" | "isPinned" | "isFavorite" | "isArchived" | "archivedAt" | "plan" | "completedAt" | "failedReason">>,
) {
  const database = databaseRequired(await getDb());
  await database.update(tasks).set({ ...update, updatedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)));
  return getTaskForUser(taskId, userId);
}

export async function softDeleteTaskForUser(taskId: string, userId: number) {
  const database = databaseRequired(await getDb());
  await database.update(tasks).set({
    deletedAt: new Date(),
    status: "cancelled",
    currentStepSummary: "Removed by user.",
    updatedAt: new Date(),
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)));
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
  provider: "docker" | "e2b" | "hopx";
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

function normalizedPersonalityDimensions(value: Partial<PersonalityDimensions>): PersonalityDimensions {
  return {
    warmth: Math.min(100, Math.max(0, Math.round(value.warmth ?? DEFAULT_PERSONALITY_DIMENSIONS.warmth))),
    directness: Math.min(100, Math.max(0, Math.round(value.directness ?? DEFAULT_PERSONALITY_DIMENSIONS.directness))),
    detail: Math.min(100, Math.max(0, Math.round(value.detail ?? DEFAULT_PERSONALITY_DIMENSIONS.detail))),
    creativity: Math.min(100, Math.max(0, Math.round(value.creativity ?? DEFAULT_PERSONALITY_DIMENSIONS.creativity))),
    initiative: Math.min(100, Math.max(0, Math.round(value.initiative ?? DEFAULT_PERSONALITY_DIMENSIONS.initiative))),
  };
}

export async function getPersonalizationProfile(userId: number) {
  const database = databaseRequired(await getDb());
  const [profile] = await database
    .select()
    .from(personalityProfiles)
    .where(eq(personalityProfiles.userId, userId))
    .limit(1);
  if (!profile) {
    return {
      userId,
      dimensions: DEFAULT_PERSONALITY_DIMENSIONS,
      enabled: true,
      sessionMemoryEnabled: true,
      longTermMemoryEnabled: true,
      updatedAt: null as Date | null,
    };
  }
  const storedDimensions = profile.dimensions && typeof profile.dimensions === "object" && !Array.isArray(profile.dimensions)
    ? profile.dimensions as Partial<PersonalityDimensions>
    : {};
  return { ...profile, dimensions: normalizedPersonalityDimensions(storedDimensions) };
}

export async function updatePersonalizationProfile(input: {
  userId: number;
  dimensions: PersonalityDimensions;
  enabled: boolean;
  sessionMemoryEnabled: boolean;
  longTermMemoryEnabled: boolean;
}) {
  const database = databaseRequired(await getDb());
  const dimensions = normalizedPersonalityDimensions(input.dimensions);
  await database
    .insert(personalityProfiles)
    .values({ ...input, dimensions })
    .onConflictDoUpdate({
      target: personalityProfiles.userId,
      set: {
        dimensions,
        enabled: input.enabled,
        sessionMemoryEnabled: input.sessionMemoryEnabled,
        longTermMemoryEnabled: input.longTermMemoryEnabled,
        updatedAt: new Date(),
      },
    });
  return getPersonalizationProfile(input.userId);
}

export async function listPersonalizationMemories(userId: number, memoryType?: "session" | "long_term") {
  const database = databaseRequired(await getDb());
  const predicate = memoryType
    ? and(eq(personalizationMemories.userId, userId), eq(personalizationMemories.memoryType, memoryType))
    : eq(personalizationMemories.userId, userId);
  return database
    .select()
    .from(personalizationMemories)
    .where(predicate)
    .orderBy(desc(personalizationMemories.updatedAt));
}

export async function createPersonalizationMemory(input: {
  userId: number;
  memoryType: "session" | "long_term";
  content: string;
  expiresAt?: Date;
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  await database.insert(personalizationMemories).values({
    id,
    userId: input.userId,
    memoryType: input.memoryType,
    content: input.content,
    source: "user",
    expiresAt: input.expiresAt,
  });
  return id;
}

export async function updatePersonalizationMemory(input: {
  id: string;
  userId: number;
  content: string;
  enabled: boolean;
}) {
  const database = databaseRequired(await getDb());
  await database
    .update(personalizationMemories)
    .set({ content: input.content, enabled: input.enabled, updatedAt: new Date() })
    .where(and(eq(personalizationMemories.id, input.id), eq(personalizationMemories.userId, input.userId)));
}

export async function deletePersonalizationMemory(id: string, userId: number) {
  const database = databaseRequired(await getDb());
  await database.delete(personalizationMemories).where(and(eq(personalizationMemories.id, id), eq(personalizationMemories.userId, userId)));
}

export async function clearSessionPersonalizationMemories(userId: number) {
  const database = databaseRequired(await getDb());
  await database
    .delete(personalizationMemories)
    .where(and(eq(personalizationMemories.userId, userId), eq(personalizationMemories.memoryType, "session")));
}

export async function getApprovedPersonalizationContext(userId: number) {
  const profile = await getPersonalizationProfile(userId);
  if (!profile.enabled) return { dimensions: null, sessionMemories: [] as string[], longTermMemories: [] as string[] };
  const now = Date.now();
  const records = await listPersonalizationMemories(userId);
  const active = records.filter(record => record.enabled && (!record.expiresAt || record.expiresAt.getTime() > now));
  const takeBounded = (items: typeof active, maxItems: number, maxCharacters: number) => {
    let remaining = maxCharacters;
    return items.slice(0, maxItems).flatMap(item => {
      const content = item.content.trim().slice(0, remaining);
      remaining -= content.length;
      return content ? [content] : [];
    });
  };
  return {
    dimensions: profile.dimensions,
    sessionMemories: profile.sessionMemoryEnabled ? takeBounded(active.filter(record => record.memoryType === "session"), 3, 360) : [],
    longTermMemories: profile.longTermMemoryEnabled ? takeBounded(active.filter(record => record.memoryType === "long_term"), 6, 720) : [],
  };
}

export async function listSkillsForUser(userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select({
      id: skills.id,
      ownerType: skills.ownerType,
      ownerUserId: skills.ownerUserId,
      name: skills.name,
      description: skills.description,
      skillMdContent: skills.skillMdContent,
      bundledFiles: skills.bundledFiles,
      category: skills.category,
      visibility: skills.visibility,
      isAutoGenerated: skills.isAutoGenerated,
      usageCount: skills.usageCount,
      createdAt: skills.createdAt,
      updatedAt: skills.updatedAt,
      installId: skillInstalls.id,
      enabled: skillInstalls.enabled,
      scope: skillInstalls.scope,
    })
    .from(skills)
    .leftJoin(skillInstalls, and(eq(skillInstalls.skillId, skills.id), eq(skillInstalls.userId, userId)))
    .where(and(isNull(skills.deletedAt), or(eq(skills.ownerUserId, userId), eq(skills.visibility, "public_platform"))))
    .orderBy(desc(skills.updatedAt));
}

export async function createSkillForUser(input: {
  userId: number;
  name: string;
  description: string;
  skillMdContent: string;
  bundledFiles?: SkillBundleFile[];
  category: SkillCategory;
  visibility: SkillVisibility;
  isAutoGenerated: boolean;
}) {
  const database = databaseRequired(await getDb());
  const skillId = randomUUID();
  const installId = randomUUID();
  await database.transaction(async tx => {
    await tx.insert(skills).values({
      id: skillId,
      ownerType: "user",
      ownerUserId: input.userId,
      name: input.name,
      description: input.description,
      skillMdContent: input.skillMdContent,
      bundledFiles: input.bundledFiles ?? [],
      category: input.category,
      visibility: input.visibility,
      createdBy: input.userId,
      isAutoGenerated: input.isAutoGenerated,
    });
    await tx.insert(skillInstalls).values({
      id: installId,
      skillId,
      userId: input.userId,
      scope: "personal",
      enabled: false,
    });
  });
  return skillId;
}

export async function updateSkillForUser(input: {
  id: string;
  userId: number;
  name: string;
  description: string;
  skillMdContent: string;
  category: SkillCategory;
  visibility: SkillVisibility;
}) {
  const database = databaseRequired(await getDb());
  const result = await database
    .update(skills)
    .set({
      name: input.name,
      description: input.description,
      skillMdContent: input.skillMdContent,
      category: input.category,
      visibility: input.visibility,
      updatedAt: new Date(),
    })
    .where(and(eq(skills.id, input.id), eq(skills.ownerUserId, input.userId), isNull(skills.deletedAt)))
    .returning({ id: skills.id });
  if (!result[0]) throw new Error("Skill not found or not editable.");
}

export async function setSkillInstallEnabledForUser(input: { skillId: string; userId: number; enabled: boolean }) {
  const database = databaseRequired(await getDb());
  const result = await database
    .update(skillInstalls)
    .set({ enabled: input.enabled, updatedAt: new Date() })
    .where(and(eq(skillInstalls.skillId, input.skillId), eq(skillInstalls.userId, input.userId)))
    .returning({ id: skillInstalls.id });
  if (!result[0]) throw new Error("Skill installation was not found.");
}

export async function softDeleteSkillForUser(input: { skillId: string; userId: number }) {
  const database = databaseRequired(await getDb());
  await database.transaction(async tx => {
    const result = await tx
      .update(skills)
      .set({ deletedAt: new Date(), visibility: "private", updatedAt: new Date() })
      .where(and(eq(skills.id, input.skillId), eq(skills.ownerUserId, input.userId), isNull(skills.deletedAt)))
      .returning({ id: skills.id });
    if (!result[0]) throw new Error("Skill not found or not removable.");
    await tx.update(skillInstalls).set({ enabled: false, updatedAt: new Date() }).where(eq(skillInstalls.skillId, input.skillId));
  });
}

export async function listEnabledSkillCandidatesForUser(userId: number): Promise<SkillCandidate[]> {
  const database = databaseRequired(await getDb());
  return database
    .select({ id: skills.id, name: skills.name, description: skills.description, skillMdContent: skills.skillMdContent })
    .from(skillInstalls)
    .innerJoin(skills, eq(skills.id, skillInstalls.skillId))
    .where(and(
      eq(skillInstalls.userId, userId),
      eq(skillInstalls.enabled, true),
      isNull(skills.deletedAt),
      or(eq(skills.ownerUserId, userId), eq(skills.visibility, "public_platform")),
    ))
    .orderBy(desc(skills.usageCount), desc(skills.updatedAt));
}

export async function getTaskSkillSelectionsForUser(taskId: string, userId: number): Promise<TaskSkillSelection[]> {
  const database = databaseRequired(await getDb());
  return database
    .select({
      skillId: taskSkillSelections.skillId,
      skillName: taskSkillSelections.skillNameSnapshot,
      skillMdContent: taskSkillSelections.skillMdSnapshot,
      relevanceScore: taskSkillSelections.relevanceScore,
      selectedAt: taskSkillSelections.selectedAt,
    })
    .from(taskSkillSelections)
    .innerJoin(tasks, eq(tasks.id, taskSkillSelections.taskId))
    .where(and(eq(taskSkillSelections.taskId, taskId), eq(tasks.userId, userId)))
    .orderBy(desc(taskSkillSelections.relevanceScore), asc(taskSkillSelections.selectedAt));
}

export async function cacheTaskSkillSelections(input: {
  taskId: string;
  userId: number;
  selections: Array<{ skillId: string; skillName: string; skillMdContent: string; relevanceScore: number }>;
}) {
  const existing = await getTaskSkillSelectionsForUser(input.taskId, input.userId);
  if (existing.length) return existing;
  const database = databaseRequired(await getDb());
  for (const selection of input.selections.slice(0, 3)) {
    const inserted = await database
      .insert(taskSkillSelections)
      .values({
        id: randomUUID(),
        taskId: input.taskId,
        skillId: selection.skillId,
        relevanceScore: selection.relevanceScore,
        skillNameSnapshot: selection.skillName,
        skillMdSnapshot: selection.skillMdContent,
      })
      .onConflictDoNothing()
      .returning({ id: taskSkillSelections.id });
    if (inserted[0]) {
      await database.update(skills).set({ usageCount: sql`${skills.usageCount} + 1`, updatedAt: new Date() }).where(eq(skills.id, selection.skillId));
      await appendTaskEvent(input.taskId, {
        type: "skill_loaded",
        payload: { skillId: selection.skillId, skillName: selection.skillName, relevanceScore: selection.relevanceScore },
      });
    }
  }
  return getTaskSkillSelectionsForUser(input.taskId, input.userId);
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
