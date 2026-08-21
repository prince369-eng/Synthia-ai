DO $$ BEGIN
  CREATE TYPE "proof_verification_status" AS ENUM ('self_attested', 'unverified', 'corroborated', 'contradicted', 'needs_review');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'proof_record';--> statement-breakpoint
CREATE TABLE "task_proof_records" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"claim" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"verification_status" "proof_verification_status" DEFAULT 'self_attested' NOT NULL,
	"confidence" integer NOT NULL,
	"recovery_guidance" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_proof_records" ADD CONSTRAINT "task_proof_records_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_proof_records" ADD CONSTRAINT "task_proof_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_proof_records" ADD CONSTRAINT "task_proof_records_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_proof_records_task_created_idx" ON "task_proof_records" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_proof_records_user_created_idx" ON "task_proof_records" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_proof_records_event_unique" ON "task_proof_records" USING btree ("event_id");
