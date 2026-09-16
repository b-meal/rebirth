ALTER TABLE "reports" ADD COLUMN "pet_id" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_pet_only_for_lost" CHECK ("reports"."kind" = 'lost' or "reports"."pet_id" is null);