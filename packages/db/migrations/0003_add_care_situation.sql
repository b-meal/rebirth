CREATE TYPE "public"."care_situation" AS ENUM('roaming', 'in_care', 'unknown');--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "care_situation" "care_situation" DEFAULT 'unknown' NOT NULL;