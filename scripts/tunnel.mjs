// 폰에서 로컬 dev 서버를 볼 때 쓰는 cloudflared 퀵 터널
// LAN 의 http 주소로는 브라우저가 보안 컨텍스트로 보지 않아 위치와 카메라가 막힘
// 진짜 인증서가 달린 https 주소를 내주므로 폰에 인증서를 심을 일이 없음
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const WINDOWS_PATHS = [
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
]
const UNIX_PATHS = ['/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared']

// MSI 로 갓 깔면 이미 열려 있던 셸의 PATH 에는 없으므로 설치 경로도 함께 봄
function resolveBinary() {
  const candidates = process.platform === 'win32' ? WINDOWS_PATHS : UNIX_PATHS
  return candidates.find((path) => existsSync(path)) ?? 'cloudflared'
}

const port = process.argv.find((arg) => arg.startsWith('--port='))?.slice(7) ?? '3000'
const binary = resolveBinary()

const child = spawn(binary, ['tunnel', '--url', `http://localhost:${port}`], {
  stdio: ['inherit', 'pipe', 'pipe'],
})

child.on('error', (cause) => {
  if (cause.code === 'ENOENT') {
    console.error('cloudflared 가 없습니다. winget install --id Cloudflare.cloudflared -e')
    process.exit(1)
  }
  throw cause
})

let announced = false

// cloudflared 는 주소를 로그 상자 안에 stderr 로 흘려 보내 눈에 잘 띄지 않음
function relay(chunk) {
  const text = chunk.toString()
  process.stderr.write(text)
  if (announced) return
  const url = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0]
  if (!url) return
  announced = true
  console.log(`\n폰에서 열 주소 ${url}\n`)
}

child.stdout.on('data', relay)
child.stderr.on('data', relay)

child.on('exit', (code) => process.exit(code ?? 0))
