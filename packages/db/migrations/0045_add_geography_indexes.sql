-- 반경 질의는 미터로 재려고 geometry 열을 ::geography 로 캐스팅함
-- 기존 GiST 인덱스는 geometry 에 걸려 있어 캐스팅한 식에는 쓰이지 못하고 표를 통째로 훑었음
-- shelters_point_idx 는 실제로 사용 0회, reports_coarse_point_idx 는 2회였음
--
-- 계획 비교 (같은 질의, 같은 데이터)
--   shelters 반경 50km   Seq Scan 146.18ms  →  Index Scan 2.20ms
--   reports  반경  3km   Seq Scan   3.33ms  →  Index Scan 0.10ms
CREATE INDEX "reports_coarse_point_geog_idx" ON "reports" USING gist (("coarse_point"::geography));--> statement-breakpoint
CREATE INDEX "shelters_point_geog_idx" ON "shelters" USING gist (("point"::geography));
