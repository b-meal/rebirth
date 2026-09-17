CREATE TYPE "public"."shelter_kind" AS ENUM('care_center', 'wildlife_center');--> statement-breakpoint
CREATE TABLE "shelters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "shelter_kind" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"org_name" text,
	"target_animals" text,
	"road_address" text,
	"lot_address" text,
	"point" geometry(point),
	"tel" text,
	"weekday_open" text,
	"weekday_close" text,
	"weekend_open" text,
	"weekend_close" text,
	"closed_day" text,
	"vet_count" smallint,
	"keeper_count" smallint,
	"data_date" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shelters_source_idx" ON "shelters" USING btree ("kind","external_id");--> statement-breakpoint
CREATE INDEX "shelters_point_idx" ON "shelters" USING gist ("point");