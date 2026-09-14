CREATE TABLE "match_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lost_id" uuid NOT NULL,
	"sighting_id" uuid NOT NULL,
	"verdict" text NOT NULL,
	"agreements" text[] DEFAULT '{}' NOT NULL,
	"conflicts" text[] DEFAULT '{}' NOT NULL,
	"check_first" text,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_reviews_pair_uk" UNIQUE("lost_id","sighting_id")
);
--> statement-breakpoint
ALTER TABLE "match_reviews" ADD CONSTRAINT "match_reviews_lost_id_reports_id_fk" FOREIGN KEY ("lost_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_reviews" ADD CONSTRAINT "match_reviews_sighting_id_reports_id_fk" FOREIGN KEY ("sighting_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_reviews_recent_idx" ON "match_reviews" USING btree ("created_at" DESC NULLS LAST);