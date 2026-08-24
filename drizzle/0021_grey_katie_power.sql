DO $$ BEGIN
  CREATE TYPE "media_generation_attempt_status" AS ENUM ('in_flight', 'succeeded', 'uncertain', 'preflight_rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "media_generation_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"request_fingerprint" varchar(128) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"status" "media_generation_attempt_status" DEFAULT 'in_flight' NOT NULL,
	"provider" varchar(64) NOT NULL,
	"model" varchar(256),
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"deliverable_id" varchar(36),
	"failure_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_generation_attempts" ADD CONSTRAINT "media_generation_attempts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_generation_attempts" ADD CONSTRAINT "media_generation_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_generation_attempts" ADD CONSTRAINT "media_generation_attempts_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_generation_attempts_task_fingerprint_unique" ON "media_generation_attempts" USING btree ("task_id","request_fingerprint");--> statement-breakpoint
CREATE INDEX "media_generation_attempts_user_status_updated_idx" ON "media_generation_attempts" USING btree ("user_id","status","updated_at");
