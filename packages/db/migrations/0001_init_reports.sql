CREATE TYPE "public"."animal_sex" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."animal_size" AS ENUM('small', 'medium', 'large', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."animal_type" AS ENUM('dog', 'cat', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."neuter_status" AS ENUM('done', 'not_done', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."report_kind" AS ENUM('sighting', 'lost', 'sheltered');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'open', 'matched', 'resolved', 'hidden');--> statement-breakpoint
CREATE TABLE "match_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lost_id" uuid NOT NULL,
	"sighting_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"breakdown" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_scores_pair_uk" UNIQUE("lost_id","sighting_id")
);
--> statement-breakpoint
CREATE TABLE "report_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "report_kind" DEFAULT 'sighting' NOT NULL,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"reporter_id" uuid,
	"contact_token" text,
	"animal_type" "animal_type" DEFAULT 'unknown' NOT NULL,
	"appearance" text,
	"colors" text[] DEFAULT '{}' NOT NULL,
	"size" "animal_size" DEFAULT 'unknown' NOT NULL,
	"sex" "animal_sex" DEFAULT 'unknown' NOT NULL,
	"neutered" "neuter_status" DEFAULT 'unknown' NOT NULL,
	"condition_tags" text[] DEFAULT '{}' NOT NULL,
	"collar" boolean,
	"injury" boolean,
	"ear_tip" boolean,
	"ai_raw" jsonb,
	"ai_model" text,
	"ai_analyzed_at" timestamp with time zone,
	"ai_edited_fields" text[] DEFAULT '{}' NOT NULL,
	"exact_point" geometry(point),
	"coarse_point" geometry(point),
	"coarse_grid_m" integer DEFAULT 300 NOT NULL,
	"area_code" text,
	"area_name" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_contactToken_unique" UNIQUE("contact_token")
);
--> statement-breakpoint
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_lost_id_reports_id_fk" FOREIGN KEY ("lost_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_sighting_id_reports_id_fk" FOREIGN KEY ("sighting_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_photos" ADD CONSTRAINT "report_photos_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_scores_lost_idx" ON "match_scores" USING btree ("lost_id","score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "report_photos_report_idx" ON "report_photos" USING btree ("report_id","sort_order");--> statement-breakpoint
CREATE INDEX "reports_exact_point_idx" ON "reports" USING gist ("exact_point");--> statement-breakpoint
CREATE INDEX "reports_coarse_point_idx" ON "reports" USING gist ("coarse_point");--> statement-breakpoint
CREATE INDEX "reports_feed_idx" ON "reports" USING btree ("kind","status","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_area_idx" ON "reports" USING btree ("area_code");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_id");