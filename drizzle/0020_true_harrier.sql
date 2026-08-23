CREATE TABLE "network_lab_manifests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lab_id" varchar(36) NOT NULL,
	"approval_id" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"signature_digest" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "network_lab_evidence" ADD COLUMN "manifest_id" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "network_lab_manifests" ADD CONSTRAINT "network_lab_manifests_lab_id_network_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."network_labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_lab_manifests" ADD CONSTRAINT "network_lab_manifests_approval_id_network_lab_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."network_lab_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_lab_manifests" ADD CONSTRAINT "network_lab_manifests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "network_lab_manifests_user_lab_expiry_idx" ON "network_lab_manifests" USING btree ("user_id","lab_id","expires_at");--> statement-breakpoint
CREATE INDEX "network_lab_manifests_unconsumed_expiry_idx" ON "network_lab_manifests" USING btree ("expires_at","consumed_at");--> statement-breakpoint
ALTER TABLE "network_lab_evidence" ADD CONSTRAINT "network_lab_evidence_manifest_id_network_lab_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."network_lab_manifests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "network_lab_evidence_manifest_unique" ON "network_lab_evidence" USING btree ("manifest_id");