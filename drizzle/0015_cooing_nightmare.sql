DO $$ BEGIN
  CREATE TYPE "handoff_policy_status" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "recovery_playbook_status" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'handoff_policy';--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'recovery_playbook';--> statement-breakpoint
CREATE TABLE "task_handoff_policies" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_task_id" varchar(36) NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"title" varchar(160) NOT NULL,
	"task_category" varchar(100) NOT NULL,
	"specialist_role" "specialist_role" NOT NULL,
	"bounded_scope" text NOT NULL,
	"evidence_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"budget_limit" integer NOT NULL,
	"time_limit_minutes" integer NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"status" "handoff_policy_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_recovery_playbooks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_task_id" varchar(36) NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"title" varchar(160) NOT NULL,
	"trigger_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recovery_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applicability" text NOT NULL,
	"blast_radius_preview" text NOT NULL,
	"rollback_guidance" text NOT NULL,
	"evidence_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" "risk_level" DEFAULT 'medium' NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"status" "recovery_playbook_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_handoff_policies" ADD CONSTRAINT "task_handoff_policies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_handoff_policies" ADD CONSTRAINT "task_handoff_policies_source_task_id_tasks_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_handoff_policies" ADD CONSTRAINT "task_handoff_policies_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_recovery_playbooks" ADD CONSTRAINT "task_recovery_playbooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_recovery_playbooks" ADD CONSTRAINT "task_recovery_playbooks_source_task_id_tasks_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_recovery_playbooks" ADD CONSTRAINT "task_recovery_playbooks_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_handoff_policies_source_created_idx" ON "task_handoff_policies" USING btree ("source_task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_handoff_policies_user_status_updated_idx" ON "task_handoff_policies" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_handoff_policies_event_unique" ON "task_handoff_policies" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "task_recovery_playbooks_source_created_idx" ON "task_recovery_playbooks" USING btree ("source_task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_recovery_playbooks_user_status_updated_idx" ON "task_recovery_playbooks" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_recovery_playbooks_event_unique" ON "task_recovery_playbooks" USING btree ("event_id");
