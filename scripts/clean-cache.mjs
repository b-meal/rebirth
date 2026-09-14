// turbo 로컬 캐시 정리. turbo 2.x 는 캐시 상한도 TTL 도 없어 지우지 않으면 무한히 쌓임
// 실행 중인 dev 서버가 쓰는 .next/dev 는 건드리지 않음
import { rm, readdir, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const cacheDir = join(root, '.turbo', 'cache')

const days = Number(process.argv.find((a) => a.startsWith('--days='))?.slice(7) ?? 0)
const dryRun = process.argv.includes('--dry-run')
const cutoff = days > 0 ? Date.now() - days * 86_400_000 : null

const formatGB = (bytes) => (bytes / 1024 ** 3).toFixed(2)

let entries
try {
  entries = await readdir(cacheDir)
} catch {
  console.log('캐시 없음:', cacheDir)
  process.exit(0)
}

let removedBytes = 0
let removedCount = 0
let keptBytes = 0
let keptCount = 0

for (const name of entries) {
  const path = join(cacheDir, name)
  const info = await stat(path).catch(() => null)
  if (!info) continue

  if (cutoff !== null && info.mtimeMs >= cutoff) {
    keptBytes += info.size
    keptCount += 1
    continue
  }

  removedBytes += info.size
  removedCount += 1
  if (!dryRun) await rm(path, { recursive: true, force: true })
}

const verb = dryRun ? '삭제 예정' : '삭제'
console.log(`${verb}: ${removedCount}개 ${formatGB(removedBytes)} GB`)
if (cutoff !== null) console.log(`유지: ${keptCount}개 ${formatGB(keptBytes)} GB (최근 ${days}일)`)
