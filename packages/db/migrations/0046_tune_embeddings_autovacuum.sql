-- report_embeddings 가 실제 데이터의 아홉 배까지 부풀어 있었음
-- heap 21MB, 인덱스 6MB 였는데 vacuum full 뒤 2.2MB 와 2.8MB. DB 전체가 64MB 에서 40MB 로 줄었음
--
-- 임베딩 재생성은 같은 행을 통째로 다시 씀. UPDATE 는 헌 판을 죽은 행으로 남기는데
-- 기본 autovacuum 은 죽은 행이 20% 를 넘어야 돌아, 재생성 한 번이 끝나기 전에는 치우지 않음
-- 행당 1.5KB 인 벡터라 한 판만 밀려도 메가바이트 단위로 쌓임
--
-- 이 표만 5% 로 낮춰 재생성 도중에도 치우게 함. 행이 1,405개라 청소 비용 자체는 작음
ALTER TABLE "report_embeddings" SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);
