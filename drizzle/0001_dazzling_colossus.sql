CREATE TABLE "task_event_sequences" (
	"task_id" varchar(36) PRIMARY KEY NOT NULL,
	"next_sequence_number" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_event_sequences" ADD CONSTRAINT "task_event_sequences_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;