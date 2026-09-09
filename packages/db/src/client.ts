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

// 빌드 시점에 라우트 모듈을 평가할 때 DATABASE_URL 이 없어도 되게 접속을 늦춤
// 즉시 연결하면 next build 의 페이지 데이터 수집 단계에서 터짐
let cached: ReturnType<typeof postgres> | undefined

function getSql() {
  cached ??= globalThis.__rebirthSql ?? createSql()
  if (process.env.NODE_ENV !== 'production') globalThis.__rebirthSql = cached
  return cached
}

type Db = ReturnType<typeof createDb>

function createDb(client: ReturnType<typeof postgres>) {
  return drizzle({ client, schema, casing: 'snake_case' })
}

let cachedDb: Db | undefined

function getDb(): Db {
  cachedDb ??= createDb(getSql())
  return cachedDb
}

// 첫 접근에서만 커넥션을 만듦. 호출부는 그대로 db.select(...) 를 씀
export const db = new Proxy({} as Db, {
  get: (_target, property, receiver) =>
    Reflect.get(getDb() as object, property, receiver),
  has: (_target, property) => Reflect.has(getDb() as object, property),
})

// sql 은 태그드 템플릿으로 호출되므로 함수를 target 으로 둬야 apply 가 걸림
export const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  get: (_target, property, receiver) =>
    Reflect.get(getSql() as object, property, receiver),
  apply: (_target, thisArg, args) =>
    Reflect.apply(getSql() as never, thisArg, args),
})
