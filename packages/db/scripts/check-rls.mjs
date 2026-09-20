// public 스키마에 잠그지 않은 표가 있는지 봄
//
//   pnpm --filter @rebirth/db db:check-rls
//
// drizzle-kit 은 RLS 를 스냅샷에 담지 않아 표를 새로 만들면 잠금이 따라오지 않음
// Supabase 는 public 스키마의 새 표에 anon 과 authenticated 권한을 기본으로 주므로
// 잠그기 전까지 그 표는 공개 키로 읽고 쓸 수 있는 상태임
// 0040, 0041 이 실제로 그렇게 새어 0042 에서 막았음

import postgres from 'postgres'

try {
  process.loadEnvFile('../../.env.local')
} catch {
  // CI 는 실제 환경변수를 씀
}

// PostGIS 가 만드는 참조표. 우리가 만든 것이 아니고 좌표계 정의만 들어 있음
const IGNORED = new Set(['spatial_ref_sys'])

const sql = postgres(process.env.DATABASE_URL, { prepare: false })

const rows = await sql`
  select c.relname as table,
         c.relrowsecurity as rls,
         (
           select count(*)
           from information_schema.role_table_grants g
           where g.table_schema = 'public'
             and g.table_name = c.relname
             and g.grantee in ('anon', 'authenticated')
         ) as public_grants
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname`

await sql.end()

const open = rows.filter(
  (row) => !IGNORED.has(row.table) && (!row.rls || Number(row.public_grants) > 0),
)

if (open.length === 0) {
  console.log(`표 ${rows.length} 개 모두 잠겨 있습니다`)
  process.exit(0)
}

console.error('잠그지 않은 표가 있습니다\n')
for (const row of open) {
  const reasons = [
    row.rls ? null : 'RLS 꺼짐',
    Number(row.public_grants) > 0 ? `anon/authenticated 권한 ${row.public_grants} 개` : null,
  ].filter(Boolean)
  console.error(`  ${row.table}: ${reasons.join(', ')}`)
}
console.error('\n마이그레이션을 하나 더해 막으십시오. 0042_lock_down_telemetry_rls.sql 과 같은 모양입니다')
console.error('  ALTER TABLE "<표>" ENABLE ROW LEVEL SECURITY;')
console.error('  REVOKE ALL ON TABLE "<표>" FROM anon, authenticated;')
process.exit(1)
