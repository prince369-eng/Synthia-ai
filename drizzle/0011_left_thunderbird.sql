DO $$ BEGIN
  CREATE TYPE "voice_session_status" AS ENUM ('starting', 'active', 'ended', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'voice_session';
--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'voice_transcript';
--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'screen_share';
--> statement-breakpoint
CREATE TABLE "voice_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"room_name" varchar(120) NOT NULL,
	"participant_identity" varchar(160) NOT NULL,
	"status" "voice_session_status" DEFAULT 'starting' NOT NULL,
	"voice_id" varchar(80) DEFAULT 'calm' NOT NULL,
	"personality" varchar(80) DEFAULT 'balanced' NOT NULL,
	"speech_rate" integer DEFAULT 100 NOT NULL,
	"screen_share_started_at" timestamp with time zone,
	"screen_share_ended_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"failure_reason" varchar(180),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_sessions_room_name_unique" UNIQUE("room_name")
);
--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voice_sessions_task_created_idx" ON "voice_sessions" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "voice_sessions_user_status_updated_idx" ON "voice_sessions" USING btree ("user_id","status","updated_at");
