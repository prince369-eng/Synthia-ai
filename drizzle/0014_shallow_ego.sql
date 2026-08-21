CREATE TABLE "task_evaluation_packs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"title" varchar(160) NOT NULL,
	"success_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewer_guidance" text NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_evaluation_results" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"task_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"pack_id" varchar(36) NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"verdict" varchar(24) NOT NULL,
	"criterion_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewer_summary" text NOT NULL,
	"proposed_lesson" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_evaluation_packs" ADD CONSTRAINT "task_evaluation_packs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evaluation_packs" ADD CONSTRAINT "task_evaluation_packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evaluation_packs" ADD CONSTRAINT "task_evaluation_packs_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evaluation_results" ADD CONSTRAINT "task_evaluation_results_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evaluation_results" ADD CONSTRAINT "task_evaluation_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evaluation_results" ADD CONSTRAINT "task_evaluation_results_pack_id_task_evaluation_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."task_evaluation_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_evaluation_results" ADD CONSTRAINT "task_evaluation_results_event_id_task_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."task_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_evaluation_packs_task_created_idx" ON "task_evaluation_packs" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_evaluation_packs_user_status_idx" ON "task_evaluation_packs" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_evaluation_packs_event_unique" ON "task_evaluation_packs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "task_evaluation_results_task_created_idx" ON "task_evaluation_results" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_evaluation_results_user_pack_created_idx" ON "task_evaluation_results" USING btree ("user_id","pack_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_evaluation_results_event_unique" ON "task_evaluation_results" USING btree ("event_id");