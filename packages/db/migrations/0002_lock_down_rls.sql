-- anon 키는 브라우저에 노출되므로 PostgREST 직접 접근을 전면 차단
-- 정책을 만들지 않으면 anon·authenticated 는 아무 행도 읽지 못함
-- 서비스 접근은 Next.js 서버가 DATABASE_URL 로만 수행
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "report_photos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "match_scores" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "reports" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "report_photos" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "match_scores" FROM anon, authenticated;
