-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- drizzle-kit 은 RLS 를 스냅샷에 담지 않아 생성 후 별도 마이그레이션으로 붙임
-- 댓글에 초안 세션 id 가 들어 있어 anon 키로 새면 작성자를 제보 밖에서 이어 볼 수 있음
ALTER TABLE "report_comments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "report_comments" FROM anon, authenticated;
