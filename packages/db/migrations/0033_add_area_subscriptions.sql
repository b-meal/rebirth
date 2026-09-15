CREATE TABLE "area_subscriptions" (
	"user_id" uuid NOT NULL,
	"area_code" text NOT NULL,
	"area_code_system" "area_code_system" NOT NULL,
	"area_name" text NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "area_subscriptions_user_id_area_code_pk" PRIMARY KEY("user_id","area_code")
);
--> statement-breakpoint
CREATE INDEX "area_subscriptions_user_idx" ON "area_subscriptions" USING btree ("user_id","created_at" DESC NULLS LAST);