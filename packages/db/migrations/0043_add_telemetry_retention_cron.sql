-- 기록용 두 표를 DB 가 스스로 오래된 행부터 지우게 함
--
-- precheck_events 는 사진 한 장마다 한 행이 쌓여 제보가 늘수록 같이 늘어남
-- error_events 는 종류마다 한 행이라 잘 늘지 않지만 다시 나타나지 않는 종류가 목록에 남음
-- 무료 플랜 500MB 안에서 둘 다 상한이 필요하고, 지우는 일은 앱이 아니라 DB 가 함
--
-- 지우는 대상은 이 두 표뿐임. reports, report_photos, users 는 건드리지 않음
-- 두 표 모두 사진, 좌표, 사용자, 세션을 담지 않아 지워도 되살릴 원본이 없음
--
-- 90일은 문턱을 다시 잡을 때 보는 창이 한 분기라서 정한 값임
-- 18:00 UTC 는 03:00 KST 로 트래픽이 가장 적은 시간대임. pg_cron 은 GMT 로 읽음
CREATE EXTENSION IF NOT EXISTS pg_cron;--> statement-breakpoint
-- 0042 와 같은 이유. 공개 키가 일정을 읽거나 바꾸지 못하게 함
REVOKE ALL ON SCHEMA "cron" FROM anon, authenticated;--> statement-breakpoint
-- cron.schedule 은 같은 이름이면 덮어씀. 다시 돌려도 일정이 겹치지 않음
SELECT cron.schedule(
  'precheck-events-retention',
  '0 18 * * *',
  $$DELETE FROM public.precheck_events WHERE created_at < now() - interval '90 days'$$
);--> statement-breakpoint
SELECT cron.schedule(
  'error-events-retention',
  '20 18 * * *',
  $$DELETE FROM public.error_events WHERE last_seen_at < now() - interval '90 days'$$
);--> statement-breakpoint
-- pg_cron 은 실행할 때마다 cron.job_run_details 에 한 행을 남김
-- 이 표에는 보존 정책이 없어 정리하는 일정을 두지 않으면 그것이 새 무한 증가가 됨
SELECT cron.schedule(
  'cron-run-details-retention',
  '40 18 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '30 days'$$
);
