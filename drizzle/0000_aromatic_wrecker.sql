CREATE TYPE "user_role" AS ENUM ('user', 'admin');--> statement-breakpoint
CREATE TYPE "task_status" AS ENUM ('queued', 'booting', 'planning', 'running', 'needs_input', 'paused', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "estimate_band" AS ENUM ('quick', 'standard', 'extensive');--> statement-breakpoint
CREATE TYPE "event_type" AS ENUM ('user_message', 'agent_message', 'clarifying_question', 'plan_update', 'tool_call', 'tool_result', 'approval_request', 'approval_response', 'screenshot', 'error', 'status_change', 'context_summary', 'user_file_edit', 'user_terminal_command');--> statement-breakpoint
CREATE TYPE "message_role" AS ENUM ('user', 'agent');--> statement-breakpoint
CREATE TYPE "sandbox_provider" AS ENUM ('docker', 'e2b');--> statement-breakpoint
CREATE TYPE "sandbox_status" AS ENUM ('booting', 'active', 'checkpointed', 'destroyed');--> statement-breakpoint
CREATE TYPE "risk_level" AS ENUM ('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "approval_status" AS ENUM ('pending', 'approved', 'rejected', 'edited');--> statement-breakpoint
CREATE TYPE "memory_category" AS ENUM ('preference', 'skill', 'project', 'tool_credential_hint', 'factual');--> statement-breakpoint
CREATE TYPE "memory_status" AS ENUM ('pending', 'active', 'archived', 'user_deleted');--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"description" text NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"tool_name" varchar(128) NOT NULL,
	"tool_input" jsonb NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"resolved_input" jsonb,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"event_id" varchar(36),
	"filename" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"storage_key" varchar(1024) NOT NULL,
	"storage_url" text NOT NULL,
	"thumbnail_url" text,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" varchar(64) NOT NULL,
	"label" varchar(120) NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"scopes" jsonb NOT NULL,
	"available_to_all_tasks" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_facts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"fact_text" text NOT NULL,
	"category" "memory_category" NOT NULL,
	"source_task_id" varchar(36),
	"confidence" double precision NOT NULL,
	"status" "memory_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sandboxes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"provider" "sandbox_provider" NOT NULL,
	"region" varchar(32) NOT NULL,
	"status" "sandbox_status" NOT NULL,
	"provider_sandbox_id" varchar(255),
	"checkpoint_ref" text,
	"max_session_seconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"destroyed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"sequence_number" bigint NOT NULL,
	"type" "event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"event_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"goal" text NOT NULL,
	"status" "task_status" DEFAULT 'queued' NOT NULL,
	"current_step_summary" text,
	"plan" jsonb NOT NULL,
	"autonomy_settings" jsonb NOT NULL,
	"sandbox_id" varchar(36),
	"involves_code" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"estimate_band" "estimate_band",
	"estimated_credits_min" integer,
	"estimated_credits_max" integer,
	"credits_consumed" double precision DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_reason" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"task_id" varchar(36),
	"credits_delta" double precision NOT NULL,
	"reason" varchar(160) NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"credits_balance" integer DEFAULT 0 NOT NULL,
	"preferences" jsonb,
	"has_completed_onboarding" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_facts" ADD CONSTRAINT "memory_facts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_facts" ADD CONSTRAINT "memory_facts_source_task_id_tasks_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandboxes" ADD CONSTRAINT "sandboxes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_requests_task_status_idx" ON "approval_requests" USING btree ("task_id","status");--> statement-breakpoint
CREATE INDEX "deliverables_task_final_created_idx" ON "deliverables" USING btree ("task_id","is_final","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_user_provider_label_unique" ON "integrations" USING btree ("user_id","provider","label");--> statement-breakpoint
CREATE INDEX "memory_facts_user_status_idx" ON "memory_facts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "sandboxes_task_status_idx" ON "sandboxes" USING btree ("task_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "task_events_sequence_unique" ON "task_events" USING btree ("task_id","sequence_number");--> statement-breakpoint
CREATE INDEX "task_events_task_created_idx" ON "task_events" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_messages_task_created_idx" ON "task_messages" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_user_status_created_idx" ON "tasks" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "tasks_user_pinned_created_idx" ON "tasks" USING btree ("user_id","is_pinned","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_user_task_created_idx" ON "usage_events" USING btree ("user_id","task_id","created_at");
