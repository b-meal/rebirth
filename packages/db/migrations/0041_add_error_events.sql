CREATE TYPE "public"."error_level" AS ENUM('failure', 'notice');--> statement-breakpoint
CREATE TABLE "error_events" (
	"fingerprint" text PRIMARY KEY NOT NULL,
	"level" "error_level" NOT NULL,
	"tag" text NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"context" jsonb,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "error_events_last_seen_idx" ON "error_events" USING btree ("last_seen_at");