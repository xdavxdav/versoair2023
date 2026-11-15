-- presentations table
CREATE TABLE IF NOT EXISTS "presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"audience" text,
	"slide_count" integer DEFAULT 10,
	"language" varchar(10) DEFAULT 'en',
	"outline" text,
	"outline_approved_at" timestamp,
	"pptx_url" text,
	"file_size" integer,
	"status" varchar(20) DEFAULT 'draft',
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- presentation_quota table
CREATE TABLE IF NOT EXISTS "presentation_quota" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer UNIQUE,
	"ip_hash" varchar(255) UNIQUE,
	"generations_today" integer DEFAULT 0,
	"last_reset_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- indexes
CREATE INDEX IF NOT EXISTS "presentations_user_idx" on "presentations" ("user_id");
CREATE INDEX IF NOT EXISTS "presentations_status_idx" on "presentations" ("status");
CREATE INDEX IF NOT EXISTS "presentations_published_idx" on "presentations" ("is_published");
CREATE INDEX IF NOT EXISTS "quota_user_reset_idx" on "presentation_quota" ("user_id", "last_reset_at");
CREATE INDEX IF NOT EXISTS "quota_ip_reset_idx" on "presentation_quota" ("ip_hash", "last_reset_at");
