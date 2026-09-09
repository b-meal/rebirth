import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

declare global {
  // 개발 중 HMR 이 커넥션을 계속 새로 열지 않도록 재사용
  var __rebirthSql: ReturnType<typeof postgres> | undefined
}

function createSql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL 이 없습니다')
  // Supabase transaction pooler 는 prepared statement 를 지원하지 않음
  return postgres(url, { prepare: false })
}

const sql = globalThis.__rebirthSql ?? createSql()
if (process.env.NODE_ENV !== 'production') globalThis.__rebirthSql = sql

export const db = drizzle({ client: sql, schema, casing: 'snake_case' })
export { sql }
