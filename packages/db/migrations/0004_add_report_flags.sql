CREATE TYPE "public"."flag_reason" AS ENUM('not-animal', 'duplicate', 'wrong-info', 'privacy', 'other');--> statement-breakpoint
CREATE TYPE "public"."flag_resolution" AS ENUM('hide', 'keep');--> statement-breakpoint
CREATE TABLE "report_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"reason" "flag_reason" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" "flag_resolution",
	"note" text
);
--> statement-breakpoint
ALTER TABLE "report_flags" ADD CONSTRAINT "report_flags_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_flags_pending_idx" ON "report_flags" USING btree ("report_id","resolved_at");--> statement-breakpoint
CREATE INDEX "report_flags_queue_idx" ON "report_flags" USING btree ("resolved_at","created_at" DESC NULLS LAST);