import { readFileSync } from "node:fs";

import type { NextConfig } from "next";

// Next 는 앱 디렉터리에서만 .env 를 찾고 loadEnvFile 은 셸에 있는 값을 덮지 않음
// 다른 프로젝트 키가 셸에 남아 있어도 저장소 파일이 이기게 직접 읽어 덮음
try {
  const file = readFileSync("../../.env.local", "utf8");
  // 편집기에 따라 CRLF 로 저장되므로 \r 을 함께 끊어야 값 끝에 남지 않음
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) process.env[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
} catch {
  // 배포 환경은 플랫폼 환경변수를 쓰므로 파일이 없어도 정상
}

const nextConfig: NextConfig = {
  // 워크스페이스 패키지를 TS 소스 그대로 소비
  transpilePackages: ["@rebirth/core", "@rebirth/db", "@rebirth/types"],

  // 선검사 모델은 2.6MB 라 한 번 받으면 다시 받지 않게 함
  // 바뀌면 파일 이름을 바꿔 새로 받게 함. public 은 해시가 붙지 않음
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "cache-control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  // 폰에서 같은 공유기의 이 컴퓨터로 붙어 볼 때 쓰는 주소
  // 없으면 dev 서버가 다른 오리진으로 보고 내부 요청을 막아 지도와 목록이 비어 옴
  // 배포는 한 오리진이라 이 목록과 무관함
  // 와일드카드는 점 하나짜리 자리만 맞아 ts.net 같은 여러 단계 호스트는 전체를 적어야 함
  // trycloudflare 는 pnpm tunnel 이 띄우는 https 주소, 실행할 때마다 앞단이 바뀌어 와일드카드로 둠
  allowedDevOrigins: [
    "192.168.75.130",
    "192.168.75.168",
    "192.168.25.51",
    "192.168.25.2",
    "192.168.45.139",
    "macbookpro.tail4b2f55.ts.net",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
