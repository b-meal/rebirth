CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"animal_type" "animal_type" DEFAULT 'unknown' NOT NULL,
	"breed_guess" text,
	"size" "animal_size" DEFAULT 'unknown' NOT NULL,
	"colors" text[] DEFAULT '{}' NOT NULL,
	"note" text,
	"photo_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pets_owner_idx" ON "pets" USING btree ("owner_id","created_at" DESC NULLS LAST);