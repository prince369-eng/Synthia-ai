CREATE TABLE "task_attachments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"storage_key" varchar(1024) NOT NULL,
	"storage_url" text NOT NULL,
	"source_type" varchar(20) DEFAULT 'upload' NOT NULL,
	"source_deliverable_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_attachments_task_created_idx" ON "task_attachments" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_attachments_user_created_idx" ON "task_attachments" USING btree ("user_id","created_at");