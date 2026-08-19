CREATE TABLE "projects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "project_id" varchar(36);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_updated_idx" ON "projects" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_name_unique" ON "projects" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_project_updated_idx" ON "tasks" USING btree ("project_id","updated_at");