-- 오류가 로컬에서 난 것인지 배포에서 난 것인지 가릴 칸
-- 로컬 개발과 Preview, Production 이 모두 같은 DB 에 쓰므로 이 칸이 없으면 둘을 구별할 수 없음
-- 이미 쌓인 행은 어느 쪽인지 알 방법이 없어 unknown 으로 둠
ALTER TABLE "error_events" ADD COLUMN "env" text DEFAULT 'unknown' NOT NULL;
