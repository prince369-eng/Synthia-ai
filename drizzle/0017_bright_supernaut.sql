DO $$ BEGIN
  CREATE TYPE "quality_budget_status" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "quality_review_depth" AS ENUM ('basic', 'standard', 'thorough');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'quality_budget';--> statement-breakpoint
CREATE TABLE "task_quality_budgets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"title" varchar(160) NOT NULL,
	"max_credits" integer NOT NULL,
	"max_runtime_minutes" integer NOT NULL,
	"max_action_cycles" integer NOT NULL,
	"min_evidence_records" integer DEFAULT 0 NOT NULL,
	"expected_deliverables" integer DEFAULT 0 NOT NULL,
	"max_revision_cycles" integer DEFAULT 0 NOT NULL,
	"review_depth" "quality_review_depth" DEFAULT 'standard' NOT NULL,
	"reviewer_guidance" text NOT NULL,
	"requires_human_review" boolean DEFAULT true NOT NULL,
	"status" "quality_budget_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_quality_budgets" ADD CONSTRAINT "task_quality_budgets_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_quality_budgets" ADD CONSTRAINT "task_quality_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_quality_budgets" ADD CONSTRAINT "task_quality_budgets_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_quality_budgets_task_updated_idx" ON "task_quality_budgets" USING btree ("task_id","updated_at");--> statement-breakpoint
CREATE INDEX "task_quality_budgets_user_status_updated_idx" ON "task_quality_budgets" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_quality_budgets_event_unique" ON "task_quality_budgets" USING btree ("event_id");
