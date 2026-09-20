-- 0002 와 같은 이유로 기록용 표도 PostgREST 직접 접근을 막음
-- drizzle-kit 은 RLS 를 스냅샷에 담지 않아 생성 후 별도 마이그레이션으로 붙임
-- 이 두 표는 0040, 0041 에서 만들면서 이 단계를 빠뜨려 anon 키로 읽고 쓸 수 있었음
-- 오류 메시지와 스택은 고장 난 자리를 그대로 알려 주고, 익명 쓰기는 표를 가짜 행으로 채움
ALTER TABLE "precheck_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "error_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "precheck_events" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "error_events" FROM anon, authenticated;
