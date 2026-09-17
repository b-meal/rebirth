-- 0002 와 같은 이유로 report_flags 도 PostGREST 직접 접근을 막음
-- drizzle-kit 은 RLS 를 스냅샷에 담지 않아 생성 후 별도 마이그레이션으로 붙임
ALTER TABLE "report_flags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "report_flags" FROM anon, authenticated;
