DO $$ BEGIN
  CREATE TYPE "policy_pack_status" AS ENUM ('enabled', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'policy_pack';--> statement-breakpoint
CREATE TABLE "task_policy_packs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_task_id" varchar(36) NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"title" varchar(160) NOT NULL,
	"task_domain" varchar(100) NOT NULL,
	"planning_guidance" text NOT NULL,
	"evidence_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "policy_pack_status" DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_policy_packs" ADD CONSTRAINT "task_policy_packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_policy_packs" ADD CONSTRAINT "task_policy_packs_source_task_id_tasks_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_policy_packs" ADD CONSTRAINT "task_policy_packs_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_policy_packs_source_created_idx" ON "task_policy_packs" USING btree ("source_task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_policy_packs_user_status_domain_idx" ON "task_policy_packs" USING btree ("user_id","status","task_domain","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_policy_packs_event_unique" ON "task_policy_packs" USING btree ("event_id");
