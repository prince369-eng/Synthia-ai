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
  scheduledWorkflowRuns,
  scheduledWorkflows,
  skillInstalls,
  skills,
  taskAttachments,
  taskDelegations,
  taskEvaluationPacks,
  taskEvaluationResults,
  taskEvents,
  taskEventSequences,
  taskMessages,
  taskPipelineHealthSignals,
  taskProofRecords,
  taskRemediationProposals,
  taskSkillSelections,
  tasks,
  type Project,
  type Task,
  type User,
  usageEvents,
  users,
  voiceSessions,
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

export type ScheduledWorkflowStatus = "active" | "paused" | "deleted";

export type ScheduledWorkflowInput = {
  userId: number;
  name: string;
  goal: string;
  autonomySettings: AutonomySettings;
  cronExpression: string;
  callbackPath: string;
  scheduleCronTaskUid: string;
  status: Extract<ScheduledWorkflowStatus, "active" | "paused">;
  nextExecutionAt?: Date | null;
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
export type SkillCandidate = { id: string; name: string; description: string; matchingTerms: string; skillMdContent: string };
export type TaskSkillSelection = { skillId: string; skillName: string; skillMdContent: string; relevanceScore: number; selectedAt: Date };
export type ProofEvidenceReference = {
  source: "task_event" | "deliverable" | "external_url" | "user_statement";
  label: string;
  locator?: string;
  description?: string;
};
export type ProofVerificationStatus = "self_attested" | "unverified" | "corroborated" | "contradicted" | "needs_review";
export type CreateTaskProofRecordInput = {
  taskId: string;
  userId: number;
  claim: string;
  evidence: ProofEvidenceReference[];
  verificationStatus: ProofVerificationStatus;
  confidence: number;
  recoveryGuidance?: string;
};

export type EvaluationCriterionInput = {
  criterion: string;
  rationale?: string;
};

export type EvaluationEvidenceRequirementInput = {
  requirement: string;
  required: boolean;
};

export type CreateTaskEvaluationPackInput = {
  taskId: string;
  userId: number;
  title: string;
  successCriteria: EvaluationCriterionInput[];
  evidenceRequirements: EvaluationEvidenceRequirementInput[];
  reviewerGuidance: string;
};

export type CreateTaskEvaluationResultInput = {
  taskId: string;
  userId: number;
  packId: string;
  verdict: "pass" | "needs_revision" | "fail" | "inconclusive";
  criterionResults: Array<{ criterion: string; result: "met" | "partially_met" | "not_met" | "not_assessed"; notes?: string }>;
  evidenceReferences: Array<{ label: string; locator?: string; description?: string }>;
  reviewerSummary: string;
  proposedLesson?: string;
};

export type TaskRunComparisonMetric = {
  taskId: string;
  title: string;
  status: Task["status"];
  updatedAt: Date;
  completedAt: Date | null;
  executionProfile: string;
  creditsConsumed: number;
  elapsedMinutes: number | null;
  deliverableCount: number;
  finalDeliverableCount: number;
  proofCount: number;
  corroboratedProofCount: number;
  proofNeedsReviewCount: number;
  evaluationCount: number;
  latestVerdict: string | null;
  errorEventCount: number;
  pipelineDriftCount: number;
  criticalPipelineSignalCount: number;
};

export type TaskRunComparisonSignal = {
  id: "execution_profile" | "credits" | "elapsed_time" | "proof_coverage" | "evaluation" | "errors" | "pipeline_drift";
  severity: "info" | "review";
  title: string;
  detail: string;
};

export const DEFAULT_PERSONALITY_DIMENSIONS: PersonalityDimensions = {
  warmth: 55,
  directness: 60,
  detail: 60,
  creativity: 50,
  initiative: 55,
};

/**
 * A persisted lexical index is the privacy-preserving fallback when no embedding service
 * has been configured. It uses reviewed metadata only, never credentials, resource bytes,
 * or task data.
 */
function skillMatchingTerms(name: string, description: string) {
  return `${name} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 1_500);
}

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

function comparisonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function executionProfileForTask(task: Task) {
  const settings = comparisonRecord(task.autonomySettings);
  const selectedModel = comparisonRecord(settings.selectedModel);
  const automaticRoute = comparisonRecord(settings.automaticRoute);
  const provider = typeof selectedModel.provider === "string" ? selectedModel.provider : typeof automaticRoute.provider === "string" ? automaticRoute.provider : null;
  const model = typeof selectedModel.model === "string" ? selectedModel.model : typeof automaticRoute.model === "string" ? automaticRoute.model : null;
  return provider && model ? `${provider}/${model}` : "Automatic routing";
}

async function taskRunMetricsForOwner(task: Task, userId: number): Promise<TaskRunComparisonMetric> {
  const database = databaseRequired(await getDb());
  const [proofs, evaluations, signals, artifactCounts, errorCounts] = await Promise.all([
    database.select({ verificationStatus: taskProofRecords.verificationStatus }).from(taskProofRecords).where(and(eq(taskProofRecords.taskId, task.id), eq(taskProofRecords.userId, userId))),
    database.select({ verdict: taskEvaluationResults.verdict }).from(taskEvaluationResults).where(and(eq(taskEvaluationResults.taskId, task.id), eq(taskEvaluationResults.userId, userId))).orderBy(desc(taskEvaluationResults.createdAt)),
    database.select({ driftType: taskPipelineHealthSignals.driftType, severity: taskPipelineHealthSignals.severity }).from(taskPipelineHealthSignals).where(and(eq(taskPipelineHealthSignals.taskId, task.id), eq(taskPipelineHealthSignals.userId, userId))),
    database.select({ total: sql<number>`count(*)`, final: sql<number>`count(*) filter (where ${deliverables.isFinal})` }).from(deliverables).where(eq(deliverables.taskId, task.id)),
    database.select({ total: sql<number>`count(*)` }).from(taskEvents).where(and(eq(taskEvents.taskId, task.id), eq(taskEvents.type, "error"))),
  ]);
  const finishedAt = task.completedAt ?? task.updatedAt;
  const startedAt = task.startedAt ?? task.createdAt;
  const elapsedMinutes = finishedAt.getTime() >= startedAt.getTime() ? Math.round((finishedAt.getTime() - startedAt.getTime()) / 60_000) : null;
  const artifacts = artifactCounts[0];
  return {
    taskId: task.id,
    title: task.title,
    status: task.status,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    executionProfile: executionProfileForTask(task),
    creditsConsumed: Number(task.creditsConsumed ?? 0),
    elapsedMinutes,
    deliverableCount: Number(artifacts?.total ?? 0),
    finalDeliverableCount: Number(artifacts?.final ?? 0),
    proofCount: proofs.length,
    corroboratedProofCount: proofs.filter(proof => proof.verificationStatus === "corroborated").length,
    proofNeedsReviewCount: proofs.filter(proof => proof.verificationStatus === "needs_review" || proof.verificationStatus === "unverified").length,
    evaluationCount: evaluations.length,
    latestVerdict: evaluations[0]?.verdict ?? null,
    errorEventCount: Number(errorCounts[0]?.total ?? 0),
    pipelineDriftCount: signals.filter(signal => signal.driftType !== "none").length,
    criticalPipelineSignalCount: signals.filter(signal => signal.severity === "critical").length,
  };
}

function percentageDifference(current: number, baseline: number) {
  if (baseline <= 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

const comparisonVerdictRank: Record<string, number> = { fail: 0, needs_revision: 1, inconclusive: 2, pass: 3 };

function createTaskRunComparisonSignals(current: TaskRunComparisonMetric, baseline: TaskRunComparisonMetric): TaskRunComparisonSignal[] {
  const signals: TaskRunComparisonSignal[] = [];
  if (current.executionProfile !== baseline.executionProfile) signals.push({ id: "execution_profile", severity: "info", title: "Execution profile differs", detail: `This task recorded ${current.executionProfile}; the comparison task recorded ${baseline.executionProfile}. This is context, not a recommendation to switch providers.` });
  const creditDifference = percentageDifference(current.creditsConsumed, baseline.creditsConsumed);
  if (creditDifference !== null && Math.abs(creditDifference) >= 25) signals.push({ id: "credits", severity: "review", title: "Credit use changed", detail: `Recorded credits are ${Math.abs(creditDifference)}% ${creditDifference > 0 ? "higher" : "lower"} than the comparison task. Review scope and evidence before drawing a conclusion.` });
  const durationDifference = current.elapsedMinutes !== null && baseline.elapsedMinutes !== null ? percentageDifference(current.elapsedMinutes, baseline.elapsedMinutes) : null;
  if (durationDifference !== null && Math.abs(durationDifference) >= 25) signals.push({ id: "elapsed_time", severity: "review", title: "Elapsed time changed", detail: `Recorded elapsed time is ${Math.abs(durationDifference)}% ${durationDifference > 0 ? "higher" : "lower"} than the comparison task. Active tasks use their latest update time.` });
  const currentCoverage = current.proofCount ? current.corroboratedProofCount / current.proofCount : 0;
  const baselineCoverage = baseline.proofCount ? baseline.corroboratedProofCount / baseline.proofCount : 0;
  if (currentCoverage + 0.2 < baselineCoverage) signals.push({ id: "proof_coverage", severity: "review", title: "Corroborated proof coverage is lower", detail: `This task has ${current.corroboratedProofCount}/${current.proofCount} corroborated proof records versus ${baseline.corroboratedProofCount}/${baseline.proofCount}. Add or review evidence manually; no proof is created automatically.` });
  const currentVerdictLabel = current.latestVerdict;
  const baselineVerdictLabel = baseline.latestVerdict;
  if (currentVerdictLabel && baselineVerdictLabel) {
    const currentVerdict = comparisonVerdictRank[currentVerdictLabel];
    const baselineVerdict = comparisonVerdictRank[baselineVerdictLabel];
    if (currentVerdict !== undefined && baselineVerdict !== undefined && currentVerdict < baselineVerdict) signals.push({ id: "evaluation", severity: "review", title: "Reviewer verdict is less favorable", detail: `The latest stored verdict is ${currentVerdictLabel.replace(/_/g, " ")} compared with ${baselineVerdictLabel.replace(/_/g, " ")}. This record cannot change a task, lesson, model, or policy.` });
  }
  if (current.errorEventCount > baseline.errorEventCount) signals.push({ id: "errors", severity: "review", title: "More recorded error events", detail: `This task has ${current.errorEventCount} recorded error event${current.errorEventCount === 1 ? "" : "s"}, compared with ${baseline.errorEventCount}. Inspect the immutable task timeline before any follow-up.` });
  if (current.pipelineDriftCount > baseline.pipelineDriftCount || current.criticalPipelineSignalCount > baseline.criticalPipelineSignalCount) signals.push({ id: "pipeline_drift", severity: "review", title: "More pipeline drift signals", detail: `This task has ${current.pipelineDriftCount} non-none drift signal${current.pipelineDriftCount === 1 ? "" : "s"} and ${current.criticalPipelineSignalCount} critical signal${current.criticalPipelineSignalCount === 1 ? "" : "s"}. Existing remediation proposals remain approval-gated.` });
  return signals;
}

/** Compares persisted owner-scoped records only; it neither invokes a provider nor mutates any agent state. */
export async function getTaskRunComparisonForUser(input: { taskId: string; userId: number; comparisonTaskId?: string }) {
  const currentTask = await getTaskForUser(input.taskId, input.userId);
  if (!currentTask) throw new Error("Task ownership could not be verified.");
  const candidateTasks = (await listTasksForUser(input.userId, true)).filter(task => task.id !== currentTask.id);
  const selectedBaseline = input.comparisonTaskId ? candidateTasks.find(task => task.id === input.comparisonTaskId) : candidateTasks.find(task => task.status === "completed") ?? candidateTasks[0];
  const current = await taskRunMetricsForOwner(currentTask, input.userId);
  const baseline = selectedBaseline ? await taskRunMetricsForOwner(selectedBaseline, input.userId) : null;
  return {
    current,
    baseline,
    availableBaselines: candidateTasks.slice(0, 24).map(task => ({ id: task.id, title: task.title, status: task.status, updatedAt: task.updatedAt })),
    signals: baseline ? createTaskRunComparisonSignals(current, baseline) : [],
    safeguards: ["Read-only comparison", "No task is rerun", "No provider, Skill, tool, or policy is changed", "Human review is required before any follow-up"],
  };
}

/** Returns owner-scoped lineage metadata only. Artifact URLs, storage keys, event payloads, provider output, and credentials are deliberately excluded. */
export async function getTaskProvenanceBundleForUser(input: { taskId: string; userId: number }) {
  const task = await getTaskForUser(input.taskId, input.userId);
  if (!task) throw new Error("Task ownership could not be verified.");
  const [events, taskDeliverables, proofRecords] = await Promise.all([
    listTaskEvents(task.id),
    listTaskDeliverables(task.id),
    listTaskProofRecordsForUser(task.id, input.userId),
  ]);
  return {
    bundle: {
      version: "synthia-provenance/v1",
      generatedAt: new Date(),
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        updatedAt: task.updatedAt,
      },
      timeline: events.map(event => ({ sequenceNumber: event.sequenceNumber, type: event.type, createdAt: event.createdAt })),
      deliverables: taskDeliverables.map(deliverable => ({ id: deliverable.id, sourceEventId: deliverable.eventId, filename: deliverable.filename, fileType: deliverable.fileType, isFinal: deliverable.isFinal, createdAt: deliverable.createdAt })),
      proofRecords: proofRecords.map(proof => ({ id: proof.id, sourceEventId: proof.eventId, claim: proof.claim, verificationStatus: proof.verificationStatus, confidence: proof.confidence, createdAt: proof.createdAt })),
    },
    safeguards: [
      "Owner-scoped metadata only",
      "No artifact bytes, URLs, storage keys, event payloads, or credentials",
      "No task, proof, evaluation, provider, policy, Skill, or approval is changed",
      "Download is generated locally only after the owner selects it",
    ],
  };
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

export async function listScheduledWorkflowsForUser(userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(scheduledWorkflows)
    .where(and(eq(scheduledWorkflows.userId, userId), sql`${scheduledWorkflows.status} <> 'deleted'`))
    .orderBy(desc(scheduledWorkflows.updatedAt));
}

export async function getScheduledWorkflowForUser(workflowId: string, userId: number) {
  const database = databaseRequired(await getDb());
  const rows = await database
    .select()
    .from(scheduledWorkflows)
    .where(and(
      eq(scheduledWorkflows.id, workflowId),
      eq(scheduledWorkflows.userId, userId),
      sql`${scheduledWorkflows.status} <> 'deleted'`,
    ))
    .limit(1);
  return rows[0];
}

export async function createScheduledWorkflowForUser(input: ScheduledWorkflowInput) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  const [workflow] = await database.insert(scheduledWorkflows).values({
    id,
    userId: input.userId,
    name: input.name,
    goal: input.goal,
    autonomySettings: input.autonomySettings,
    cronExpression: input.cronExpression,
    callbackPath: input.callbackPath,
    scheduleCronTaskUid: input.scheduleCronTaskUid,
    status: input.status,
    nextExecutionAt: input.nextExecutionAt ?? null,
  }).returning();
  if (!workflow) throw new Error("The scheduled workflow could not be created.");
  return workflow;
}

export async function updateScheduledWorkflowForUser(
  workflowId: string,
  userId: number,
  patch: Partial<Pick<typeof scheduledWorkflows.$inferInsert, "status" | "cronExpression" | "nextExecutionAt" | "lastExecutedAt">>,
) {
  const database = databaseRequired(await getDb());
  const [workflow] = await database
    .update(scheduledWorkflows)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(
      eq(scheduledWorkflows.id, workflowId),
      eq(scheduledWorkflows.userId, userId),
      sql`${scheduledWorkflows.status} <> 'deleted'`,
    ))
    .returning();
  return workflow;
}

export async function softDeleteScheduledWorkflowForUser(workflowId: string, userId: number) {
  return updateScheduledWorkflowForUser(workflowId, userId, { status: "deleted", nextExecutionAt: null });
}

/** Atomically claims a scheduler minute slot so callback retries cannot duplicate a task. */
export async function claimScheduledWorkflowRun(cronTaskUid: string, runSlot: Date) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    const rows = await transaction
      .select()
      .from(scheduledWorkflows)
      .where(and(eq(scheduledWorkflows.scheduleCronTaskUid, cronTaskUid), eq(scheduledWorkflows.status, "active")))
      .limit(1);
    const workflow = rows[0];
    if (!workflow) return { workflow: undefined, accepted: false as const, runId: undefined };
    const runId = randomUUID();
    const inserted = await transaction
      .insert(scheduledWorkflowRuns)
      .values({ id: runId, workflowId: workflow.id, runSlot })
      .onConflictDoNothing()
      .returning({ id: scheduledWorkflowRuns.id });
    return { workflow, accepted: Boolean(inserted[0]), runId: inserted[0]?.id };
  });
}

export async function attachScheduledWorkflowRunTask(input: {
  runId: string;
  workflowId: string;
  taskId: string;
  executedAt: Date;
}) {
  const database = databaseRequired(await getDb());
  await database.transaction(async transaction => {
    await transaction
      .update(scheduledWorkflowRuns)
      .set({ taskId: input.taskId })
      .where(and(eq(scheduledWorkflowRuns.id, input.runId), eq(scheduledWorkflowRuns.workflowId, input.workflowId)));
    await transaction
      .update(scheduledWorkflows)
      .set({ lastExecutedAt: input.executedAt, updatedAt: input.executedAt })
      .where(eq(scheduledWorkflows.id, input.workflowId));
  });
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

export async function listTaskProofRecordsForUser(taskId: string, userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskProofRecords)
    .where(and(eq(taskProofRecords.taskId, taskId), eq(taskProofRecords.userId, userId)))
    .orderBy(desc(taskProofRecords.createdAt));
}

/**
 * Records a user-approved claim and reference metadata atomically with the immutable task event.
 * It deliberately stores no provider output, audio, screen frames, artifact bytes, or model-generated evidence.
 */
export async function createTaskProofRecordForUser(input: CreateTaskProofRecordInput) {
  const database = databaseRequired(await getDb());
  const proofId = randomUUID();
  const createdAt = new Date();
  const result = await database.transaction(async transaction => {
    const [ownedTask] = await transaction
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, input.userId)))
      .limit(1);
    if (!ownedTask) throw new Error("Task ownership could not be verified.");

    const event = await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "proof_record",
      payload: {
        action: "recorded",
        proofId,
        claimPreview: input.claim.slice(0, 180),
        evidenceCount: input.evidence.length,
        verificationStatus: input.verificationStatus,
        confidence: input.confidence,
      },
    });
    const [proof] = await transaction
      .insert(taskProofRecords)
      .values({
        id: proofId,
        taskId: input.taskId,
        userId: input.userId,
        eventId: event.id,
        claim: input.claim,
        evidence: input.evidence,
        verificationStatus: input.verificationStatus,
        confidence: input.confidence,
        recoveryGuidance: input.recoveryGuidance ?? null,
        createdAt,
      })
      .returning();
    return { proof, sequenceNumber: event.sequenceNumber };
  });
  publishTaskEvent(input.taskId, result.sequenceNumber);
  return result.proof;
}

export async function listTaskEvaluationPacksForUser(taskId: string, userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskEvaluationPacks)
    .where(and(eq(taskEvaluationPacks.taskId, taskId), eq(taskEvaluationPacks.userId, userId)))
    .orderBy(desc(taskEvaluationPacks.updatedAt));
}

export async function listTaskEvaluationResultsForUser(taskId: string, userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskEvaluationResults)
    .where(and(eq(taskEvaluationResults.taskId, taskId), eq(taskEvaluationResults.userId, userId)))
    .orderBy(desc(taskEvaluationResults.createdAt));
}

/**
 * Creates only a declarative owner-authored review contract. It cannot schedule
 * execution, change agent configuration, or promote a skill/model.
 */
export async function createTaskEvaluationPackForUser(input: CreateTaskEvaluationPackInput) {
  const database = databaseRequired(await getDb());
  const packId = randomUUID();
  const createdAt = new Date();
  const result = await database.transaction(async transaction => {
    const [ownedTask] = await transaction
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, input.userId), isNull(tasks.deletedAt)))
      .limit(1);
    if (!ownedTask) throw new Error("Task ownership could not be verified.");

    const event = await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "task_metadata",
      payload: {
        action: "evaluation_pack_created",
        packId,
        titlePreview: input.title.slice(0, 160),
        criterionCount: input.successCriteria.length,
        evidenceRequirementCount: input.evidenceRequirements.length,
      },
    });
    const [pack] = await transaction
      .insert(taskEvaluationPacks)
      .values({
        id: packId,
        taskId: input.taskId,
        userId: input.userId,
        eventId: event.id,
        title: input.title,
        successCriteria: input.successCriteria,
        evidenceRequirements: input.evidenceRequirements,
        reviewerGuidance: input.reviewerGuidance,
        status: "ready",
        createdAt,
        updatedAt: createdAt,
      })
      .returning();
    if (!pack) throw new Error("The evaluation pack could not be created.");
    return { pack, sequenceNumber: event.sequenceNumber };
  });
  publishTaskEvent(input.taskId, result.sequenceNumber);
  return result.pack;
}

/**
 * Persists a reviewer outcome. A proposed lesson stays informational until the
 * user separately creates and approves a reviewed-learning record.
 */
export async function createTaskEvaluationResultForUser(input: CreateTaskEvaluationResultInput) {
  const database = databaseRequired(await getDb());
  const resultId = randomUUID();
  const createdAt = new Date();
  const result = await database.transaction(async transaction => {
    const [ownedPack] = await transaction
      .select({ id: taskEvaluationPacks.id })
      .from(taskEvaluationPacks)
      .innerJoin(tasks, eq(taskEvaluationPacks.taskId, tasks.id))
      .where(and(
        eq(taskEvaluationPacks.id, input.packId),
        eq(taskEvaluationPacks.taskId, input.taskId),
        eq(taskEvaluationPacks.userId, input.userId),
        eq(tasks.userId, input.userId),
        isNull(tasks.deletedAt),
      ))
      .limit(1);
    if (!ownedPack) throw new Error("Evaluation pack ownership could not be verified.");

    const event = await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "task_metadata",
      payload: {
        action: "evaluation_result_recorded",
        resultId,
        packId: input.packId,
        verdict: input.verdict,
        criterionResultCount: input.criterionResults.length,
        evidenceReferenceCount: input.evidenceReferences.length,
        hasProposedLesson: Boolean(input.proposedLesson),
      },
    });
    const [evaluationResult] = await transaction
      .insert(taskEvaluationResults)
      .values({
        id: resultId,
        taskId: input.taskId,
        userId: input.userId,
        packId: input.packId,
        eventId: event.id,
        verdict: input.verdict,
        criterionResults: input.criterionResults,
        evidenceReferences: input.evidenceReferences,
        reviewerSummary: input.reviewerSummary,
        proposedLesson: input.proposedLesson ?? null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();
    if (!evaluationResult) throw new Error("The evaluation result could not be recorded.");
    return { evaluationResult, sequenceNumber: event.sequenceNumber };
  });
  publishTaskEvent(input.taskId, result.sequenceNumber);
  return result.evaluationResult;
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

export type VoiceSessionSettings = {
  voiceId: string;
  personality: string;
  speechRate: number;
};

export type PipelineHealthSignalInput = {
  taskId: string;
  userId: number;
  sourceName: string;
  signalType: string;
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  severity: "info" | "warning" | "critical";
  driftType: "none" | "additive" | "breaking" | "type_change" | "nullability_change" | "semantic";
  summary: string;
  expectedFingerprint?: string;
  observedFingerprint?: string;
  observedAt: Date;
  metadata?: Record<string, string | number | boolean | null>;
};

export type RemediationProposalInput = {
  taskId: string;
  userId: number;
  signalId?: string;
  diagnosis: string;
  remediationPlan: string[];
  dryRunSummary: string;
  rollbackGuidance: string;
  riskLevel: "low" | "medium" | "high";
};

export type TaskDelegationInput = {
  taskId: string;
  userId: number;
  parentDelegationId?: string;
  role: "coordinator" | "researcher" | "analyst" | "writer" | "coder" | "reviewer";
  title: string;
  scope: string;
  contextSummary: string;
  dependencyIds: string[];
};

export async function listTaskPipelineHealthSignalsForUser(taskId: string, userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskPipelineHealthSignals)
    .where(and(eq(taskPipelineHealthSignals.taskId, taskId), eq(taskPipelineHealthSignals.userId, userId)))
    .orderBy(desc(taskPipelineHealthSignals.observedAt), desc(taskPipelineHealthSignals.createdAt));
}

export async function listTaskRemediationProposalsForUser(taskId: string, userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskRemediationProposals)
    .where(and(eq(taskRemediationProposals.taskId, taskId), eq(taskRemediationProposals.userId, userId)))
    .orderBy(desc(taskRemediationProposals.createdAt));
}

export async function listTaskDelegationsForUser(taskId: string, userId: number) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(taskDelegations)
    .where(and(eq(taskDelegations.taskId, taskId), eq(taskDelegations.userId, userId)))
    .orderBy(asc(taskDelegations.createdAt));
}

export async function createTaskPipelineHealthSignalForUser(input: PipelineHealthSignalInput) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    const event = await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "pipeline_health",
      payload: {
        sourceName: input.sourceName,
        signalType: input.signalType,
        healthStatus: input.healthStatus,
        severity: input.severity,
        driftType: input.driftType,
        summary: input.summary,
        observedAt: input.observedAt.toISOString(),
      },
    });
    const record = {
      id: randomUUID(),
      taskId: input.taskId,
      userId: input.userId,
      eventId: event.id,
      sourceName: input.sourceName,
      signalType: input.signalType,
      healthStatus: input.healthStatus,
      severity: input.severity,
      driftType: input.driftType,
      summary: input.summary,
      expectedFingerprint: input.expectedFingerprint ?? null,
      observedFingerprint: input.observedFingerprint ?? null,
      observedAt: input.observedAt,
      metadata: input.metadata ?? {},
    };
    await transaction.insert(taskPipelineHealthSignals).values(record);
    return record;
  });
}

export async function createTaskRemediationProposalForUser(input: RemediationProposalInput) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    if (input.signalId) {
      const [signal] = await transaction
        .select({ id: taskPipelineHealthSignals.id })
        .from(taskPipelineHealthSignals)
        .where(and(
          eq(taskPipelineHealthSignals.id, input.signalId),
          eq(taskPipelineHealthSignals.taskId, input.taskId),
          eq(taskPipelineHealthSignals.userId, input.userId),
        ))
        .limit(1);
      if (!signal) throw new Error("The selected health signal is unavailable.");
    }
    const event = await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "remediation_proposal",
      payload: {
        signalId: input.signalId ?? null,
        status: "proposed",
        riskLevel: input.riskLevel,
        requiresApproval: true,
        stepCount: input.remediationPlan.length,
      },
    });
    const record = {
      id: randomUUID(),
      taskId: input.taskId,
      userId: input.userId,
      signalId: input.signalId ?? null,
      eventId: event.id,
      status: "proposed" as const,
      diagnosis: input.diagnosis,
      remediationPlan: input.remediationPlan,
      dryRunSummary: input.dryRunSummary,
      rollbackGuidance: input.rollbackGuidance,
      requiresApproval: true,
      riskLevel: input.riskLevel,
    };
    await transaction.insert(taskRemediationProposals).values(record);
    return record;
  });
}

export async function createTaskDelegationForUser(input: TaskDelegationInput) {
  const database = databaseRequired(await getDb());
  return database.transaction(async transaction => {
    if (input.parentDelegationId) {
      const [parent] = await transaction
        .select({ id: taskDelegations.id })
        .from(taskDelegations)
        .where(and(eq(taskDelegations.id, input.parentDelegationId), eq(taskDelegations.taskId, input.taskId), eq(taskDelegations.userId, input.userId)))
        .limit(1);
      if (!parent) throw new Error("The parent delegation is unavailable.");
    }
    if (input.dependencyIds.length) {
      const dependencies = await transaction
        .select({ id: taskDelegations.id })
        .from(taskDelegations)
        .where(and(eq(taskDelegations.taskId, input.taskId), eq(taskDelegations.userId, input.userId)));
      const ownedIds = new Set(dependencies.map(item => item.id));
      if (input.dependencyIds.some(id => !ownedIds.has(id))) throw new Error("One or more delegation dependencies are unavailable.");
    }
    const event = await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "delegation",
      payload: {
        role: input.role,
        status: "proposed",
        title: input.title,
        dependencyCount: input.dependencyIds.length,
        requiresApproval: true,
      },
    });
    const record = {
      id: randomUUID(),
      taskId: input.taskId,
      userId: input.userId,
      parentDelegationId: input.parentDelegationId ?? null,
      eventId: event.id,
      role: input.role,
      status: "proposed" as const,
      title: input.title,
      scope: input.scope,
      contextSummary: input.contextSummary,
      dependencyIds: input.dependencyIds,
      requiresApproval: true,
    };
    await transaction.insert(taskDelegations).values(record);
    return record;
  });
}

export async function createVoiceSessionForTask(input: {
  taskId: string;
  userId: number;
  roomName: string;
  participantIdentity: string;
  settings: VoiceSessionSettings;
}) {
  const database = databaseRequired(await getDb());
  const id = randomUUID();
  const now = new Date();
  await database.transaction(async transaction => {
    await transaction.insert(voiceSessions).values({
      id,
      taskId: input.taskId,
      userId: input.userId,
      roomName: input.roomName,
      participantIdentity: input.participantIdentity,
      status: "starting",
      voiceId: input.settings.voiceId,
      personality: input.settings.personality,
      speechRate: input.settings.speechRate,
    });
    await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "voice_session",
      payload: { sessionId: id, action: "requested", voiceId: input.settings.voiceId, personality: input.settings.personality, speechRate: input.settings.speechRate, requestedAt: now.toISOString() },
    });
  });
  return { id, roomName: input.roomName, participantIdentity: input.participantIdentity };
}

export async function updateVoiceSessionForUser(input: {
  sessionId: string;
  taskId: string;
  userId: number;
  action: "connected" | "ended" | "failed" | "screen_started" | "screen_ended";
  failureReason?: string;
}) {
  const database = databaseRequired(await getDb());
  const now = new Date();
  return database.transaction(async transaction => {
    const [session] = await transaction.select().from(voiceSessions).where(and(eq(voiceSessions.id, input.sessionId), eq(voiceSessions.taskId, input.taskId), eq(voiceSessions.userId, input.userId))).limit(1);
    if (!session) return undefined;
    const patch = input.action === "connected"
      ? { status: "active" as const, updatedAt: now, failureReason: null }
      : input.action === "ended"
        ? { status: "ended" as const, endedAt: now, updatedAt: now }
        : input.action === "failed"
          ? { status: "failed" as const, endedAt: now, updatedAt: now, failureReason: input.failureReason?.slice(0, 180) ?? "The realtime connection ended unexpectedly." }
          : input.action === "screen_started"
            ? { screenShareStartedAt: now, screenShareEndedAt: null, updatedAt: now }
            : { screenShareEndedAt: now, updatedAt: now };
    await transaction.update(voiceSessions).set(patch).where(eq(voiceSessions.id, session.id));
    await appendTaskEventInTransaction(transaction, input.taskId, {
      type: input.action.startsWith("screen_") ? "screen_share" : "voice_session",
      payload: { sessionId: session.id, action: input.action, occurredAt: now.toISOString(), ...(input.failureReason ? { failureReason: input.failureReason.slice(0, 180) } : {}) },
    });
    return { ...session, ...patch };
  });
}

export async function recordVoiceTranscriptForTask(input: {
  taskId: string;
  userId: number;
  sessionId: string;
  role: "user" | "agent";
  content: string;
}) {
  const database = databaseRequired(await getDb());
  const content = input.content.trim();
  if (!content) throw new Error("A finalized voice transcript cannot be empty.");
  return database.transaction(async transaction => {
    const [session] = await transaction.select({ id: voiceSessions.id }).from(voiceSessions).where(and(eq(voiceSessions.id, input.sessionId), eq(voiceSessions.taskId, input.taskId), eq(voiceSessions.userId, input.userId))).limit(1);
    if (!session) throw new Error("The Voice Mode session is unavailable.");
    const event = await appendTaskEventInTransaction(transaction, input.taskId, {
      type: "voice_transcript",
      payload: { sessionId: input.sessionId, role: input.role, content, finalized: true },
    });
    await transaction.insert(taskMessages).values({ id: randomUUID(), taskId: input.taskId, role: input.role, content, eventId: event.id });
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

export async function listPendingTaskLessonsForUser(input: { taskId: string; userId: number }) {
  const database = databaseRequired(await getDb());
  return database
    .select()
    .from(memoryFacts)
    .where(and(eq(memoryFacts.userId, input.userId), eq(memoryFacts.sourceTaskId, input.taskId), eq(memoryFacts.category, "skill"), eq(memoryFacts.status, "pending")))
    .orderBy(desc(memoryFacts.createdAt));
}

export async function reviewPendingTaskLessonForUser(input: { taskId: string; userId: number; memoryId: string; status: "active" | "archived" }) {
  const database = databaseRequired(await getDb());
  const updated = await database
    .update(memoryFacts)
    .set({ status: input.status, lastUsedAt: input.status === "active" ? new Date() : undefined })
    .where(and(
      eq(memoryFacts.id, input.memoryId),
      eq(memoryFacts.userId, input.userId),
      eq(memoryFacts.sourceTaskId, input.taskId),
      eq(memoryFacts.category, "skill"),
      eq(memoryFacts.status, "pending"),
    ))
    .returning({ id: memoryFacts.id });
  return Boolean(updated[0]);
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
  const [records, approvedLessons] = await Promise.all([listPersonalizationMemories(userId), listMemoryFacts(userId)]);
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
    longTermMemories: profile.longTermMemoryEnabled
      ? [
        ...takeBounded(active.filter(record => record.memoryType === "long_term"), 4, 480),
        ...approvedLessons.filter(record => record.category === "skill").slice(0, 2).map(record => record.factText.trim().slice(0, 120)).filter(Boolean),
      ]
      : [],
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
      matchingTerms: skills.matchingTerms,
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
      matchingTerms: skillMatchingTerms(input.name, input.description),
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
      matchingTerms: skillMatchingTerms(input.name, input.description),
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
    .select({ id: skills.id, name: skills.name, description: skills.description, matchingTerms: skills.matchingTerms, skillMdContent: skills.skillMdContent })
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
