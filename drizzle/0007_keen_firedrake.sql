DO $$ BEGIN
  CREATE TYPE "skill_owner_type" AS ENUM ('platform', 'user', 'workspace');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "skill_category" AS ENUM ('document_style', 'coding_practice', 'domain_workflow', 'data_analysis', 'network_ops', 'security_research', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "skill_visibility" AS ENUM ('private', 'workspace', 'public_platform');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "skill_install_scope" AS ENUM ('personal', 'workspace');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'skill_loaded';
--> statement-breakpoint
CREATE TABLE "skill_installs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"skill_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"scope" "skill_install_scope" DEFAULT 'personal' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"owner_type" "skill_owner_type" DEFAULT 'user' NOT NULL,
	"owner_user_id" integer,
	"name" varchar(100) NOT NULL,
	"description" varchar(600) NOT NULL,
	"skill_md_content" text NOT NULL,
	"bundled_files" jsonb NOT NULL,
	"category" "skill_category" DEFAULT 'other' NOT NULL,
	"visibility" "skill_visibility" DEFAULT 'private' NOT NULL,
	"created_by" integer NOT NULL,
	"is_auto_generated" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_skill_selections" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"skill_id" varchar(36) NOT NULL,
	"relevance_score" double precision NOT NULL,
	"skill_name_snapshot" varchar(100) NOT NULL,
	"skill_md_snapshot" text NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skill_installs" ADD CONSTRAINT "skill_installs_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_installs" ADD CONSTRAINT "skill_installs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skill_selections" ADD CONSTRAINT "task_skill_selections_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skill_selections" ADD CONSTRAINT "task_skill_selections_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "skill_installs_skill_user_scope_unique" ON "skill_installs" USING btree ("skill_id","user_id","scope");--> statement-breakpoint
CREATE INDEX "skill_installs_user_enabled_idx" ON "skill_installs" USING btree ("user_id","enabled","updated_at");--> statement-breakpoint
CREATE INDEX "skills_owner_updated_idx" ON "skills" USING btree ("owner_user_id","updated_at");--> statement-breakpoint
CREATE INDEX "skills_visibility_usage_idx" ON "skills" USING btree ("visibility","usage_count");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_owner_name_unique" ON "skills" USING btree ("owner_user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "task_skill_selections_task_skill_unique" ON "task_skill_selections" USING btree ("task_id","skill_id");--> statement-breakpoint
CREATE INDEX "task_skill_selections_task_selected_idx" ON "task_skill_selections" USING btree ("task_id","selected_at");
