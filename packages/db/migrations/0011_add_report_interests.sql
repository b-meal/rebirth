CREATE TABLE "report_interests" (
	"report_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_interests_report_id_session_id_pk" PRIMARY KEY("report_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "report_interests" ADD CONSTRAINT "report_interests_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_interests_session_idx" ON "report_interests" USING btree ("session_id");