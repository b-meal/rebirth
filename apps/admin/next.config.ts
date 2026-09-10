import { readFileSync } from "node:fs";

import type { NextConfig } from "next";

// Next 는 앱 디렉터리에서만 .env 를 찾고 loadEnvFile 은 셸에 있는 값을 덮지 않음
// 다른 프로젝트 키가 셸에 남아 있어도 저장소 파일이 이기게 직접 읽어 덮음
try {
  const file = readFileSync("../../.env.local", "utf8");
  for (const line of file.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) process.env[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
} catch {
  // 배포 환경은 플랫폼 환경변수를 쓰므로 파일이 없어도 정상
}

const nextConfig: NextConfig = {
  transpilePackages: ["@rebirth/db", "@rebirth/types"],
};

export default nextConfig;
