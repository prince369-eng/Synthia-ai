DO $$ BEGIN
  CREATE TYPE "pipeline_health_status" AS ENUM ('healthy', 'degraded', 'unhealthy', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "pipeline_severity" AS ENUM ('info', 'warning', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "schema_drift_type" AS ENUM ('none', 'additive', 'breaking', 'type_change', 'nullability_change', 'semantic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "remediation_status" AS ENUM ('draft', 'proposed', 'approved', 'rejected', 'applied', 'failed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "specialist_role" AS ENUM ('coordinator', 'researcher', 'analyst', 'writer', 'coder', 'reviewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "delegation_status" AS ENUM ('proposed', 'approved', 'queued', 'running', 'blocked', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'pipeline_health';--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'remediation_proposal';--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'delegation';--> statement-breakpoint
CREATE TABLE "task_delegations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"parent_delegation_id" varchar(36),
	"event_id" varchar(36) NOT NULL,
	"role" "specialist_role" NOT NULL,
	"status" "delegation_status" DEFAULT 'proposed' NOT NULL,
	"title" varchar(180) NOT NULL,
	"scope" text NOT NULL,
	"context_summary" text NOT NULL,
	"dependency_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_pipeline_health_signals" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"source_name" varchar(120) NOT NULL,
	"signal_type" varchar(80) NOT NULL,
	"health_status" "pipeline_health_status" DEFAULT 'unknown' NOT NULL,
	"severity" "pipeline_severity" DEFAULT 'info' NOT NULL,
	"drift_type" "schema_drift_type" DEFAULT 'none' NOT NULL,
	"summary" text NOT NULL,
	"expected_fingerprint" varchar(160),
	"observed_fingerprint" varchar(160),
	"observed_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_remediation_proposals" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"signal_id" varchar(36),
	"event_id" varchar(36) NOT NULL,
	"status" "remediation_status" DEFAULT 'draft' NOT NULL,
	"diagnosis" text NOT NULL,
	"remediation_plan" jsonb NOT NULL,
	"dry_run_summary" text NOT NULL,
	"rollback_guidance" text NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"risk_level" "risk_level" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_pipeline_health_signals" ADD CONSTRAINT "task_pipeline_health_signals_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_pipeline_health_signals" ADD CONSTRAINT "task_pipeline_health_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_pipeline_health_signals" ADD CONSTRAINT "task_pipeline_health_signals_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_remediation_proposals" ADD CONSTRAINT "task_remediation_proposals_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_remediation_proposals" ADD CONSTRAINT "task_remediation_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_remediation_proposals" ADD CONSTRAINT "task_remediation_proposals_signal_id_task_pipeline_health_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."task_pipeline_health_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_remediation_proposals" ADD CONSTRAINT "task_remediation_proposals_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_delegations_task_created_idx" ON "task_delegations" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_delegations_user_status_idx" ON "task_delegations" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_delegations_event_unique" ON "task_delegations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "task_pipeline_health_task_observed_idx" ON "task_pipeline_health_signals" USING btree ("task_id","observed_at");--> statement-breakpoint
CREATE INDEX "task_pipeline_health_user_created_idx" ON "task_pipeline_health_signals" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_pipeline_health_event_unique" ON "task_pipeline_health_signals" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "task_remediation_task_created_idx" ON "task_remediation_proposals" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_remediation_user_status_idx" ON "task_remediation_proposals" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_remediation_event_unique" ON "task_remediation_proposals" USING btree ("event_id");
