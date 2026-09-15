CREATE TABLE "animal_kinds" (
	"kind_cd" text PRIMARY KEY NOT NULL,
	"kind_nm" text NOT NULL,
	"up_kind_cd" text NOT NULL,
	"up_kind_nm" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gov_regions" (
	"org_cd" text PRIMARY KEY NOT NULL,
	"org_nm" text NOT NULL,
	"parent_cd" text
);
--> statement-breakpoint
CREATE TABLE "rescue_stats" (
	"collected_on" date NOT NULL,
	"sido_cd" text NOT NULL,
	"sido_nm" text NOT NULL,
	"up_kind_nm" text NOT NULL,
	"process_state" text NOT NULL,
	"total" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "animal_kinds_up_idx" ON "animal_kinds" USING btree ("up_kind_cd","kind_nm");--> statement-breakpoint
CREATE INDEX "gov_regions_parent_idx" ON "gov_regions" USING btree ("parent_cd","org_nm");--> statement-breakpoint
CREATE UNIQUE INDEX "rescue_stats_key_uk" ON "rescue_stats" USING btree ("collected_on","sido_cd","up_kind_nm","process_state");--> statement-breakpoint
CREATE INDEX "rescue_stats_day_idx" ON "rescue_stats" USING btree ("collected_on");