-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- drizzle-kit 은 RLS 를 스냅샷에 담지 않아 생성 후 별도 마이그레이션으로 붙임
-- 세션 토큰 해시와 관리 권한이 들어 있어 anon 키로 새면 계정 없는 인증이 무너짐
ALTER TABLE "draft_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "draft_uploads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "draft_locations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "analysis_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "manage_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "manage_grants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "support_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "support_replies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "flag_receipts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "legal_documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "draft_sessions" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "draft_uploads" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "draft_locations" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "analysis_jobs" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "idempotency_keys" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "manage_sessions" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "manage_grants" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "consent_records" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "support_requests" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "support_replies" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "flag_receipts" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "legal_documents" FROM anon, authenticated;
