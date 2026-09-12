-- 커뮤니티 피드를 내 동네로 좁혀 읽기 위한 인덱스
-- 동으로 거른 뒤 최신순으로 읽으므로 두 열을 같은 순서로 둠
-- 이미 있으면 건너뛰므로 다시 돌려도 깨지지 않음
CREATE INDEX IF NOT EXISTS "community_posts_area_idx" ON "community_posts" USING btree ("area_name","created_at" DESC NULLS LAST);
