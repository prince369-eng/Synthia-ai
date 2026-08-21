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
const eventTypeEnum = pgEnum("event_type", ["user_message", "agent_message", "clarifying_question", "plan_update", "tool_call", "tool_result", "approval_request", "approval_response", "screenshot", "error", "status_change", "context_summary", "user_file_edit", "user_terminal_command", "task_metadata", "skill_loaded"]);
const messageRoleEnum = pgEnum("message_role", ["user", "agent"]);
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
export const eventTypes = ["user_message", "agent_message", "clarifying_question", "plan_update", "tool_call", "tool_result", "approval_request", "approval_response", "screenshot", "error", "status_change", "context_summary", "user_file_edit", "user_terminal_command", "task_metadata", "skill_loaded"] as const;

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
