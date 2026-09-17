DELETE FROM "report_photos" a
USING "report_photos" b
WHERE a."report_id" = b."report_id"
  AND a."storage_path" = b."storage_path"
  AND a."id" > b."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "report_photos_object_uk" ON "report_photos" USING btree ("report_id","storage_path");
