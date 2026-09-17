CREATE TABLE "report_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"session_id" uuid,
	"author_seq" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_comments_thread_idx" ON "report_comments" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "report_comments_author_idx" ON "report_comments" USING btree ("report_id","session_id");