// 보존 일정이 등록돼 있고 마지막 실행이 성공했는지 봄
//
//   pnpm --filter @rebirth/db db:check-cron
//
// 일정은 DB 안에서 도는 것이라 앱 로그에도 Vercel 로그에도 흔적이 남지 않음
// 조용히 멈춰 있어도 알 방법이 여기뿐임

import postgres from 'postgres'

try {
  process.loadEnvFile('../../.env.local')
} catch {
  // CI 는 실제 환경변수를 씀
}

// 0043 이 등록한 일정. 이름이 곧 계약이라 여기서 다시 적어 대조함
const EXPECTED = ['precheck-events-retention', 'error-events-retention', 'cron-run-details-retention']

const sql = postgres(process.env.DATABASE_URL, { prepare: false })

const installed = await sql`select extversion from pg_extension where extname = 'pg_cron'`
if (installed.length === 0) {
  console.error('pg_cron 이 설치돼 있지 않습니다. 0043 마이그레이션을 적용하십시오')
  await sql.end()
  process.exit(1)
}

const jobs = await sql`
  select j.jobname,
         j.schedule,
         j.active,
         d.status,
         d.start_time,
         d.return_message
  from cron.job j
  left join lateral (
    select status, start_time, return_message
    from cron.job_run_details
    where jobid = j.jobid
    order by start_time desc
    limit 1
  ) d on true
  where j.jobname = any(${EXPECTED})
  order by j.jobname`

await sql.end()

const found = new Set(jobs.map((job) => job.jobname))
const missing = EXPECTED.filter((name) => !found.has(name))
const broken = jobs.filter((job) => !job.active || (job.status && job.status !== 'succeeded'))

console.log(`pg_cron ${installed[0].extversion}`)
for (const job of jobs) {
  const last = job.start_time
    ? `${job.status} ${job.start_time.toISOString()}`
    : '아직 실행된 적 없음'
  console.log(`  ${job.jobname.padEnd(28)} ${job.schedule.padEnd(12)} ${last}`)
  if (job.return_message && job.status !== 'succeeded') console.log(`    ${job.return_message}`)
}

if (missing.length === 0 && broken.length === 0) {
  console.log(`일정 ${jobs.length} 개 모두 정상입니다`)
  process.exit(0)
}

if (missing.length > 0) console.error(`\n없는 일정: ${missing.join(', ')}`)
if (broken.length > 0) console.error(`\n멈췄거나 실패한 일정: ${broken.map((j) => j.jobname).join(', ')}`)
process.exit(1)
