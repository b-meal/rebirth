-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- 반려동물 기록은 계정 소유 자료라 anon 키로 새면 남의 동물 정보가 드러남
ALTER TABLE "pets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "pets" FROM anon, authenticated;
