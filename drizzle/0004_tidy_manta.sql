ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'task_metadata';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tasks_user_archive_updated_idx" ON "tasks" USING btree ("user_id","is_archived","updated_at");--> statement-breakpoint
CREATE INDEX "tasks_user_favorite_updated_idx" ON "tasks" USING btree ("user_id","is_favorite","updated_at");
