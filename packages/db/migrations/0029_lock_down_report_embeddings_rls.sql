-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- source_text 에 제보 외형이 그대로 들어 있어 anon 키로 새면 본문이 통째로 드러남
ALTER TABLE "report_embeddings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "report_embeddings" FROM anon, authenticated;
