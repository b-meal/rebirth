-- 0016 과 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- 반려동물 사진 경로가 anon 키로 새면 남의 동물 사진이 서명 없이 드러남
ALTER TABLE "pet_photos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "pet_photos" FROM anon, authenticated;
