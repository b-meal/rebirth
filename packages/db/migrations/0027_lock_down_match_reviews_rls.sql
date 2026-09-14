-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- 근거 문장에 두 제보의 외형이 함께 들어 있어 anon 키로 새면 후보 관계가 드러남
ALTER TABLE "match_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "match_reviews" FROM anon, authenticated;
