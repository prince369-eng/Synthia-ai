CREATE TABLE "personality_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"dimensions" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"session_memory_enabled" boolean DEFAULT true NOT NULL,
	"long_term_memory_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personalization_memories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"memory_type" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"source" varchar(32) DEFAULT 'user' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personality_profiles" ADD CONSTRAINT "personality_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personalization_memories" ADD CONSTRAINT "personalization_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personalization_memories_user_type_updated_idx" ON "personalization_memories" USING btree ("user_id","memory_type","updated_at");--> statement-breakpoint
CREATE INDEX "personalization_memories_user_enabled_expiry_idx" ON "personalization_memories" USING btree ("user_id","enabled","expires_at");