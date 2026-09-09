import type { NextConfig } from "next";

// Next 는 앱 디렉터리에서만 .env 를 찾음. 시크릿은 루트 한 곳에 두므로 직접 읽음
try {
  process.loadEnvFile("../../.env.local");
} catch {
  // 배포 환경은 플랫폼 환경변수를 쓰므로 파일이 없어도 정상
}

const nextConfig: NextConfig = {
  // 워크스페이스 패키지를 TS 소스 그대로 소비
  transpilePackages: ["@rebirth/core", "@rebirth/db", "@rebirth/types"],
};

export default nextConfig;
