DO $$ BEGIN
  CREATE TYPE "browser_change_set_status" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'browser_change_set';
--> statement-breakpoint
CREATE TABLE "task_browser_change_sets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"title" varchar(160) NOT NULL,
	"target_url" text NOT NULL,
	"proposed_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewer_guidance" text NOT NULL,
	"requires_human_review" boolean DEFAULT true NOT NULL,
	"status" "browser_change_set_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_browser_change_sets" ADD CONSTRAINT "task_browser_change_sets_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_browser_change_sets" ADD CONSTRAINT "task_browser_change_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_browser_change_sets" ADD CONSTRAINT "task_browser_change_sets_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_browser_change_sets_task_updated_idx" ON "task_browser_change_sets" USING btree ("task_id","updated_at");--> statement-breakpoint
CREATE INDEX "task_browser_change_sets_user_status_updated_idx" ON "task_browser_change_sets" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_browser_change_sets_event_unique" ON "task_browser_change_sets" USING btree ("event_id");
