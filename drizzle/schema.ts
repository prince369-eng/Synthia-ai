import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
const taskStatusEnum = pgEnum("task_status", ["queued", "booting", "planning", "running", "needs_input", "paused", "completed", "failed", "cancelled"]);
const estimateBandEnum = pgEnum("estimate_band", ["quick", "standard", "extensive"]);
const eventTypeEnum = pgEnum("event_type", ["user_message", "agent_message", "clarifying_question", "plan_update", "tool_call", "tool_result", "approval_request", "approval_response", "screenshot", "error", "status_change", "context_summary", "user_file_edit", "user_terminal_command", "task_metadata", "skill_loaded", "voice_session", "voice_transcript", "screen_share", "proof_record", "pipeline_health", "remediation_proposal", "delegation"]);
const messageRoleEnum = pgEnum("message_role", ["user", "agent"]);
const voiceSessionStatusEnum = pgEnum("voice_session_status", ["starting", "active", "ended", "failed"]);
const proofVerificationStatusEnum = pgEnum("proof_verification_status", ["self_attested", "unverified", "corroborated", "contradicted", "needs_review"]);
const pipelineHealthStatusEnum = pgEnum("pipeline_health_status", ["healthy", "degraded", "unhealthy", "unknown"]);
const pipelineSeverityEnum = pgEnum("pipeline_severity", ["info", "warning", "critical"]);
const schemaDriftTypeEnum = pgEnum("schema_drift_type", ["none", "additive", "breaking", "type_change", "nullability_change", "semantic"]);
const remediationStatusEnum = pgEnum("remediation_status", ["draft", "proposed", "approved", "rejected", "applied", "failed", "expired"]);
const specialistRoleEnum = pgEnum("specialist_role", ["coordinator", "researcher", "analyst", "writer", "coder", "reviewer"]);
const delegationStatusEnum = pgEnum("delegation_status", ["proposed", "approved", "queued", "running", "blocked", "completed", "failed", "cancelled"]);
const sandboxProviderEnum = pgEnum("sandbox_provider", ["docker", "e2b", "hopx"]);
const sandboxStatusEnum = pgEnum("sandbox_status", ["booting", "active", "checkpointed", "destroyed"]);
const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);
const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "edited"]);
const memoryCategoryEnum = pgEnum("memory_category", ["preference", "skill", "project", "tool_credential_hint", "factual"]);
const memoryStatusEnum = pgEnum("memory_status", ["pending", "active", "archived", "user_deleted"]);
const skillOwnerTypeEnum = pgEnum("skill_owner_type", ["platform", "user", "workspace"]);
const skillCategoryEnum = pgEnum("skill_category", ["document_style", "coding_practice", "domain_workflow", "data_analysis", "network_ops", "security_research", "other"]);
const skillVisibilityEnum = pgEnum("skill_visibility", ["private", "workspace", "public_platform"]);
const skillInstallScopeEnum = pgEnum("skill_install_scope", ["personal", "workspace"]);
const scheduledWorkflowStatusEnum = pgEnum("scheduled_workflow_status", ["active", "paused", "deleted"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").notNull().default("user"),
  creditsBalance: integer("credits_balance").notNull().default(0),
  preferences: jsonb("preferences"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export const taskStatuses = ["queued", "booting", "planning", "running", "needs_input", "paused", "completed", "failed", "cancelled"] as const;
export const eventTypes = ["user_message", "agent_message", "clarifying_question", "plan_update", "tool_call", "tool_result", "approval_request", "approval_response", "screenshot", "error", "status_change", "context_summary", "user_file_edit", "user_terminal_command", "task_metadata", "skill_loaded", "voice_session", "voice_transcript", "screen_share", "proof_record", "pipeline_health", "remediation_proposal", "delegation"] as const;

export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("projects_user_updated_idx").on(table.userId, table.updatedAt),
  uniqueIndex("projects_user_name_unique").on(table.userId, table.name),
]);

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 180 }).notNull(),
  goal: text("goal").notNull(),
  status: taskStatusEnum("status").notNull().default("queued"),
  currentStepSummary: text("current_step_summary"),
  plan: jsonb("plan").notNull(),
  autonomySettings: jsonb("autonomy_settings").notNull(),
  sandboxId: varchar("sandbox_id", { length: 36 }),
  involvesCode: boolean("involves_code").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  estimateBand: estimateBandEnum("estimate_band"),
  estimatedCreditsMin: integer("estimated_credits_min"),
  estimatedCreditsMax: integer("estimated_credits_max"),
  creditsConsumed: doublePrecision("credits_consumed").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedReason: varchar("failed_reason", { length: 160 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("tasks_user_status_created_idx").on(table.userId, table.status, table.createdAt),
  index("tasks_user_pinned_created_idx").on(table.userId, table.isPinned, table.createdAt),
  index("tasks_user_archive_updated_idx").on(table.userId, table.isArchived, table.updatedAt),
  index("tasks_user_favorite_updated_idx").on(table.userId, table.isFavorite, table.updatedAt),
  index("tasks_project_updated_idx").on(table.projectId, table.updatedAt),
]);

export const taskEvents = pgTable("task_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
  type: eventTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("task_events_sequence_unique").on(table.taskId, table.sequenceNumber),
  index("task_events_task_created_idx").on(table.taskId, table.createdAt),
]);

/** A user-owned recurring task template keyed from Heartbeat's trusted task UID. */
export const scheduledWorkflows = pgTable("scheduled_workflows", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  goal: text("goal").notNull(),
  autonomySettings: jsonb("autonomy_settings").notNull(),
  cronExpression: varchar("cron_expression", { length: 80 }).notNull(),
  callbackPath: varchar("callback_path", { length: 160 }).notNull(),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }).unique(),
  status: scheduledWorkflowStatusEnum("status").notNull().default("paused"),
  lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
  nextExecutionAt: timestamp("next_execution_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("scheduled_workflows_user_status_idx").on(table.userId, table.status, table.updatedAt),
  index("scheduled_workflows_cron_task_uid_idx").on(table.scheduleCronTaskUid),
]);

/** A unique time-slot claim makes retries create at most one task per minute. */
export const scheduledWorkflowRuns = pgTable("scheduled_workflow_runs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workflowId: varchar("workflow_id", { length: 36 }).notNull().references(() => scheduledWorkflows.id, { onDelete: "cascade" }),
  runSlot: timestamp("run_slot", { withTimezone: true }).notNull(),
  taskId: varchar("task_id", { length: 36 }).references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("scheduled_workflow_runs_slot_unique").on(table.workflowId, table.runSlot),
  index("scheduled_workflow_runs_workflow_created_idx").on(table.workflowId, table.createdAt),
]);

export const taskEventSequences = pgTable("task_event_sequences", {
  taskId: varchar("task_id", { length: 36 }).primaryKey().references(() => tasks.id, { onDelete: "cascade" }),
  nextSequenceNumber: bigint("next_sequence_number", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskMessages = pgTable("task_messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  eventId: varchar("event_id", { length: 36 }).references(() => taskEvents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("task_messages_task_created_idx").on(table.taskId, table.createdAt)]);

/**
 * Voice sessions are transport metadata only. Audio, screen frames, and provider
 * credentials are deliberately never persisted here; the task event stream remains
 * the auditable history for explicit lifecycle and finalized transcript records.
 */
export const voiceSessions = pgTable("voice_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roomName: varchar("room_name", { length: 120 }).notNull().unique(),
  participantIdentity: varchar("participant_identity", { length: 160 }).notNull(),
  status: voiceSessionStatusEnum("status").notNull().default("starting"),
  voiceId: varchar("voice_id", { length: 80 }).notNull().default("calm"),
  personality: varchar("personality", { length: 80 }).notNull().default("balanced"),
  speechRate: integer("speech_rate").notNull().default(100),
  screenShareStartedAt: timestamp("screen_share_started_at", { withTimezone: true }),
  screenShareEndedAt: timestamp("screen_share_ended_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  failureReason: varchar("failure_reason", { length: 180 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("voice_sessions_task_created_idx").on(table.taskId, table.createdAt),
  index("voice_sessions_user_status_updated_idx").on(table.userId, table.status, table.updatedAt),
]);

/**
 * A user-owned, append-only proof record for a task claim. Evidence contains metadata
 * and user-approved references only; no provider result, screen frame, audio, or
 * artifact bytes are duplicated here.
 */
export const taskProofRecords = pgTable("task_proof_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => taskEvents.id, { onDelete: "cascade" }),
  claim: text("claim").notNull(),
  evidence: jsonb("evidence").notNull(),
  verificationStatus: proofVerificationStatusEnum("verification_status").notNull().default("self_attested"),
  confidence: integer("confidence").notNull(),
  recoveryGuidance: text("recovery_guidance"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("task_proof_records_task_created_idx").on(table.taskId, table.createdAt),
  index("task_proof_records_user_created_idx").on(table.userId, table.createdAt),
  uniqueIndex("task_proof_records_event_unique").on(table.eventId),
]);

export const sandboxes = pgTable("sandboxes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  provider: sandboxProviderEnum("provider").notNull(),
  region: varchar("region", { length: 32 }).notNull(),
  status: sandboxStatusEnum("status").notNull(),
  providerSandboxId: varchar("provider_sandbox_id", { length: 255 }),
  checkpointRef: text("checkpoint_ref"),
  maxSessionSeconds: integer("max_session_seconds").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  destroyedAt: timestamp("destroyed_at", { withTimezone: true }),
}, table => [index("sandboxes_task_status_idx").on(table.taskId, table.status)]);

export const deliverables = pgTable("deliverables", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).references(() => taskEvents.id, { onDelete: "set null" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  storageKey: varchar("storage_key", { length: 1024 }).notNull(),
  storageUrl: text("storage_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  isFinal: boolean("is_final").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("deliverables_task_final_created_idx").on(table.taskId, table.isFinal, table.createdAt)]);

export const taskAttachments = pgTable("task_attachments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  storageKey: varchar("storage_key", { length: 1024 }).notNull(),
  storageUrl: text("storage_url").notNull(),
  sourceType: varchar("source_type", { length: 20 }).notNull().default("upload"),
  sourceDeliverableId: varchar("source_deliverable_id", { length: 36 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("task_attachments_task_created_idx").on(table.taskId, table.createdAt),
  index("task_attachments_user_created_idx").on(table.userId, table.createdAt),
]);

export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => taskEvents.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  toolName: varchar("tool_name", { length: 128 }).notNull(),
  toolInput: jsonb("tool_input").notNull(),
  status: approvalStatusEnum("status").notNull().default("pending"),
  resolvedInput: jsonb("resolved_input"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("approval_requests_task_status_idx").on(table.taskId, table.status)]);

export const integrations = pgTable("integrations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  scopes: jsonb("scopes").notNull(),
  availableToAllTasks: boolean("available_to_all_tasks").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("integration_user_provider_label_unique").on(table.userId, table.provider, table.label)]);

/**
 * Skills shape how an agent uses existing capabilities. They intentionally do not
 * store credentials, OAuth scopes, or connector configuration.
 */
export const skills = pgTable("skills", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerType: skillOwnerTypeEnum("owner_type").notNull().default("user"),
  ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 600 }).notNull(),
  matchingTerms: text("matching_terms").notNull().default(""),
  skillMdContent: text("skill_md_content").notNull(),
  bundledFiles: jsonb("bundled_files").notNull(),
  category: skillCategoryEnum("category").notNull().default("other"),
  visibility: skillVisibilityEnum("visibility").notNull().default("private"),
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  isAutoGenerated: boolean("is_auto_generated").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, table => [
  index("skills_owner_updated_idx").on(table.ownerUserId, table.updatedAt),
  index("skills_visibility_usage_idx").on(table.visibility, table.usageCount),
  uniqueIndex("skills_owner_name_unique").on(table.ownerUserId, table.name),
]);

export const skillInstalls = pgTable("skill_installs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  skillId: varchar("skill_id", { length: 36 }).notNull().references(() => skills.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scope: skillInstallScopeEnum("scope").notNull().default("personal"),
  enabled: boolean("enabled").notNull().default(false),
  installedAt: timestamp("installed_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("skill_installs_skill_user_scope_unique").on(table.skillId, table.userId, table.scope),
  index("skill_installs_user_enabled_idx").on(table.userId, table.enabled, table.updatedAt),
]);

/** Task-scoped snapshots prevent later skill edits from silently changing an active task. */
export const taskSkillSelections = pgTable("task_skill_selections", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  skillId: varchar("skill_id", { length: 36 }).notNull().references(() => skills.id, { onDelete: "restrict" }),
  relevanceScore: doublePrecision("relevance_score").notNull(),
  skillNameSnapshot: varchar("skill_name_snapshot", { length: 100 }).notNull(),
  skillMdSnapshot: text("skill_md_snapshot").notNull(),
  selectedAt: timestamp("selected_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("task_skill_selections_task_skill_unique").on(table.taskId, table.skillId),
  index("task_skill_selections_task_selected_idx").on(table.taskId, table.selectedAt),
]);

export const memoryFacts = pgTable("memory_facts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  factText: text("fact_text").notNull(),
  category: memoryCategoryEnum("category").notNull(),
  sourceTaskId: varchar("source_task_id", { length: 36 }).references(() => tasks.id, { onDelete: "set null" }),
  confidence: doublePrecision("confidence").notNull(),
  status: memoryStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
}, table => [index("memory_facts_user_status_idx").on(table.userId, table.status)]);

export const personalityProfiles = pgTable("personality_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  dimensions: jsonb("dimensions").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sessionMemoryEnabled: boolean("session_memory_enabled").notNull().default(true),
  longTermMemoryEnabled: boolean("long_term_memory_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * User-recorded pipeline health observations. The record intentionally stores
 * bounded observability metadata, never source rows, credentials, or an active
 * monitoring connection.
 */
export const taskPipelineHealthSignals = pgTable("task_pipeline_health_signals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => taskEvents.id, { onDelete: "cascade" }),
  sourceName: varchar("source_name", { length: 120 }).notNull(),
  signalType: varchar("signal_type", { length: 80 }).notNull(),
  healthStatus: pipelineHealthStatusEnum("health_status").notNull().default("unknown"),
  severity: pipelineSeverityEnum("severity").notNull().default("info"),
  driftType: schemaDriftTypeEnum("drift_type").notNull().default("none"),
  summary: text("summary").notNull(),
  expectedFingerprint: varchar("expected_fingerprint", { length: 160 }),
  observedFingerprint: varchar("observed_fingerprint", { length: 160 }),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("task_pipeline_health_task_observed_idx").on(table.taskId, table.observedAt),
  index("task_pipeline_health_user_created_idx").on(table.userId, table.createdAt),
  uniqueIndex("task_pipeline_health_event_unique").on(table.eventId),
]);

/**
 * A bounded, reviewable repair proposal. All proposals start without an
 * executable integration action and remain subject to explicit approval.
 */
export const taskRemediationProposals = pgTable("task_remediation_proposals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  signalId: varchar("signal_id", { length: 36 }).references(() => taskPipelineHealthSignals.id, { onDelete: "set null" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => taskEvents.id, { onDelete: "cascade" }),
  status: remediationStatusEnum("status").notNull().default("draft"),
  diagnosis: text("diagnosis").notNull(),
  remediationPlan: jsonb("remediation_plan").notNull(),
  dryRunSummary: text("dry_run_summary").notNull(),
  rollbackGuidance: text("rollback_guidance").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("task_remediation_task_created_idx").on(table.taskId, table.createdAt),
  index("task_remediation_user_status_idx").on(table.userId, table.status, table.updatedAt),
  uniqueIndex("task_remediation_event_unique").on(table.eventId),
]);

/**
 * Specialist work proposed inside a task. Context is deliberately curated and
 * dependencies remain declarative until a separately configured executor runs
 * an explicitly approved delegation.
 */
export const taskDelegations = pgTable("task_delegations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentDelegationId: varchar("parent_delegation_id", { length: 36 }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => taskEvents.id, { onDelete: "cascade" }),
  role: specialistRoleEnum("role").notNull(),
  status: delegationStatusEnum("status").notNull().default("proposed"),
  title: varchar("title", { length: 180 }).notNull(),
  scope: text("scope").notNull(),
  contextSummary: text("context_summary").notNull(),
  dependencyIds: jsonb("dependency_ids").notNull().default([]),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("task_delegations_task_created_idx").on(table.taskId, table.createdAt),
  index("task_delegations_user_status_idx").on(table.userId, table.status, table.updatedAt),
  uniqueIndex("task_delegations_event_unique").on(table.eventId),
]);

/**
 * User-authored evaluation criteria for a specific task. Packs are declarative:
 * they never change a model, skill, tool, permission, or task state by themselves.
 */
export const taskEvaluationPacks = pgTable("task_evaluation_packs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => taskEvents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  successCriteria: jsonb("success_criteria").notNull().default([]),
  evidenceRequirements: jsonb("evidence_requirements").notNull().default([]),
  reviewerGuidance: text("reviewer_guidance").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("task_evaluation_packs_task_created_idx").on(table.taskId, table.createdAt),
  index("task_evaluation_packs_user_status_idx").on(table.userId, table.status, table.updatedAt),
  uniqueIndex("task_evaluation_packs_event_unique").on(table.eventId),
]);

/**
 * Explicit reviewer outcomes. A proposed lesson is informational until the
 * owner separately records and approves it through the reviewed-learning flow.
 */
export const taskEvaluationResults = pgTable("task_evaluation_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packId: varchar("pack_id", { length: 36 }).notNull().references(() => taskEvaluationPacks.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => taskEvents.id, { onDelete: "cascade" }),
  verdict: varchar("verdict", { length: 24 }).notNull(),
  criterionResults: jsonb("criterion_results").notNull().default([]),
  evidenceReferences: jsonb("evidence_references").notNull().default([]),
  reviewerSummary: text("reviewer_summary").notNull(),
  proposedLesson: text("proposed_lesson"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("task_evaluation_results_task_created_idx").on(table.taskId, table.createdAt),
  index("task_evaluation_results_user_pack_created_idx").on(table.userId, table.packId, table.createdAt),
  uniqueIndex("task_evaluation_results_event_unique").on(table.eventId),
]);

export const personalizationMemories = pgTable("personalization_memories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memoryType: varchar("memory_type", { length: 16 }).notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 32 }).notNull().default("user"),
  enabled: boolean("enabled").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("personalization_memories_user_type_updated_idx").on(table.userId, table.memoryType, table.updatedAt),
  index("personalization_memories_user_enabled_expiry_idx").on(table.userId, table.enabled, table.expiresAt),
]);

export const usageEvents = pgTable("usage_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: varchar("task_id", { length: 36 }).references(() => tasks.id, { onDelete: "set null" }),
  creditsDelta: doublePrecision("credits_delta").notNull(),
  reason: varchar("reason", { length: 160 }).notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("usage_events_user_task_created_idx").on(table.userId, table.taskId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type Skill = typeof skills.$inferSelect;
