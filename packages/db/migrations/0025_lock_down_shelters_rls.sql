-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- 공개 정보라 유출 위험은 없지만 앱이 Drizzle 로만 읽으므로 anon 경로를 열어 둘 이유가 없음
ALTER TABLE "shelters" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "shelters" FROM anon, authenticated;
