-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- 구독 목록은 그 사람이 사는 동네를 드러내므로 공개 테이블보다 더 좁게 둠
ALTER TABLE "area_subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "area_subscriptions" FROM anon, authenticated;
