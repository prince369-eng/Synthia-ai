DO $$ BEGIN
  CREATE TYPE "public"."scheduled_workflow_status" AS ENUM('active', 'paused', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "scheduled_workflow_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workflow_id" varchar(36) NOT NULL,
	"run_slot" timestamp with time zone NOT NULL,
	"task_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_workflows" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"goal" text NOT NULL,
	"autonomy_settings" jsonb NOT NULL,
	"cron_expression" varchar(80) NOT NULL,
	"callback_path" varchar(160) NOT NULL,
	"schedule_cron_task_uid" varchar(65),
	"status" "scheduled_workflow_status" DEFAULT 'paused' NOT NULL,
	"last_executed_at" timestamp with time zone,
	"next_execution_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_workflows_schedule_cron_task_uid_unique" UNIQUE("schedule_cron_task_uid")
);
--> statement-breakpoint
ALTER TABLE "scheduled_workflow_runs" ADD CONSTRAINT "scheduled_workflow_runs_workflow_id_scheduled_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."scheduled_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_workflow_runs" ADD CONSTRAINT "scheduled_workflow_runs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_workflows" ADD CONSTRAINT "scheduled_workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_workflow_runs_slot_unique" ON "scheduled_workflow_runs" USING btree ("workflow_id","run_slot");--> statement-breakpoint
CREATE INDEX "scheduled_workflow_runs_workflow_created_idx" ON "scheduled_workflow_runs" USING btree ("workflow_id","created_at");--> statement-breakpoint
CREATE INDEX "scheduled_workflows_user_status_idx" ON "scheduled_workflows" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "scheduled_workflows_cron_task_uid_idx" ON "scheduled_workflows" USING btree ("schedule_cron_task_uid");
