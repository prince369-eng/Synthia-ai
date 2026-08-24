DO $$ BEGIN
  CREATE TYPE "network_lab_status" AS ENUM ('draft', 'ready_for_review', 'approved', 'evidence_received', 'validation_passed', 'validation_failed', 'incomplete', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "network_lab_approval_decision" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "network_lab_evidence_verdict" AS ENUM ('pass', 'fail', 'inconclusive', 'not_comparable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "network_lab_approvals" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lab_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"decision" "network_lab_approval_decision" DEFAULT 'pending' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"review_note" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "network_lab_evidence" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lab_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"verdict" "network_lab_evidence_verdict" NOT NULL,
	"summary" varchar(1000) NOT NULL,
	"assertion_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"artifact_digests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"runner_attestation" varchar(512) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "network_labs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"objective" text NOT NULL,
	"vendor_families" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topology" jsonb DEFAULT '{"nodes":[],"links":[]}'::jsonb NOT NULL,
	"configuration_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validation_plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rollback_plan" text NOT NULL,
	"runner_platform" varchar(40) DEFAULT 'linux_virtualbox' NOT NULL,
	"status" "network_lab_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "network_lab_approvals" ADD CONSTRAINT "network_lab_approvals_lab_id_network_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."network_labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_lab_approvals" ADD CONSTRAINT "network_lab_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_lab_evidence" ADD CONSTRAINT "network_lab_evidence_lab_id_network_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."network_labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_lab_evidence" ADD CONSTRAINT "network_lab_evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_labs" ADD CONSTRAINT "network_labs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "network_lab_approvals_lab_revision_unique" ON "network_lab_approvals" USING btree ("lab_id","revision");--> statement-breakpoint
CREATE INDEX "network_lab_approvals_user_lab_created_idx" ON "network_lab_approvals" USING btree ("user_id","lab_id","created_at");--> statement-breakpoint
CREATE INDEX "network_lab_evidence_user_lab_created_idx" ON "network_lab_evidence" USING btree ("user_id","lab_id","created_at");--> statement-breakpoint
CREATE INDEX "network_labs_user_status_updated_idx" ON "network_labs" USING btree ("user_id","status","updated_at");
