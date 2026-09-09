import { defineConfig } from 'drizzle-kit'

// 루트 .env.local 로드. CI 는 실제 환경변수를 쓰므로 없으면 무시
try {
  process.loadEnvFile('../../.env.local')
} catch {
  // noop
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: 'snake_case',
  strict: true,
  verbose: true,
})
