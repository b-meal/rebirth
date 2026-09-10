-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- 관심 표시에 초안 세션 id 가 들어 있어 anon 키로 새면 세션별 열람 기록이 드러남
ALTER TABLE "report_interests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "report_interests" FROM anon, authenticated;
