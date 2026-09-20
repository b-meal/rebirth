CREATE TYPE "public"."precheck_source" AS ENUM('device', 'server');--> statement-breakpoint
CREATE TYPE "public"."precheck_verdict" AS ENUM('animal', 'not-animal', 'unknown');--> statement-breakpoint
CREATE TABLE "precheck_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_score" real,
	"threshold" real,
	"device_ms" integer,
	"device_verdict" "precheck_verdict",
	"server_verdict" "precheck_verdict",
	"verdict" "precheck_verdict" NOT NULL,
	"source" "precheck_source" NOT NULL,
	"photo_width" integer,
	"photo_height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "precheck_events_created_idx" ON "precheck_events" USING btree ("created_at");