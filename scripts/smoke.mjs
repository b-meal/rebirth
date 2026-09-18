#!/usr/bin/env node
// 심사 기간 서비스 링크 생존 확인용 읽기 전용 점검

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PATHS = [
  "/",
  "/find",
  "/reports",
  "/search",
  "/shelters",
  "/community",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
];

// Vercel 배포 보호가 켜지면 200 과 함께 로그인 화면이 오는 경우 대비
const PROTECTED_MARK = "Authentication Required";

let failed = 0;

for (const path of PATHS) {
  const url = `${BASE}${path}`;
  let status = 0;
  let note = "";

  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "rebirth-smoke" } });
    status = res.status;
    const body = await res.text();
    if (body.includes(PROTECTED_MARK)) note = "배포 보호";
  } catch (error) {
    note = error instanceof Error ? error.message : String(error);
  }

  const ok = status === 200 && note === "";
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "fail"} ${String(status).padStart(3, " ")} ${path}${note ? ` ${note}` : ""}`);
}

console.log(`total ${PATHS.length} · fail ${failed} · base ${BASE}`);
process.exit(failed > 0 ? 1 : 0);
