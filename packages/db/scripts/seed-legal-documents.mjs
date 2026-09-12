// 법적 고지 원문을 legal_documents 에 넣는 스크립트
// 본문을 파일에서 읽는 이유는 터미널을 거쳐 넣으면 한글이 깨지기 때문
// 실제로 이 경로 없이 넣은 기존 2건이 U+FFFD 로 저장되어 화면이 전부 깨져 있었음
//
// 실행: node packages/db/scripts/seed-legal-documents.mjs [--publish]
// --publish 를 주면 published 로, 없으면 draft 로 넣음
// 운영 주체가 미정인 동안에는 draft 로 두어 /privacy 가 "발행 전" 화면을 쓰게 함

import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

// loadEnvFile 은 셸에 이미 있는 값을 덮지 않아 다른 프로젝트 키가 섞임, 파일을 원천으로 둠
function readEnvFile(file) {
  const env = {};
  // CRLF 파일에서 값 끝에 \r 이 남으면 접속 문자열이 조용히 깨짐
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
  return env;
}

const { DATABASE_URL } = readEnvFile(path.join(repoRoot, ".env.local"));
if (!DATABASE_URL) throw new Error("DATABASE_URL 이 없습니다");

/** 넣을 문서. 본문은 같은 폴더의 legal/ 아래 원문 파일에서 읽음 */
const DOCUMENTS = [
  {
    docType: "privacy",
    version: "2026-09-01",
    title: "개인정보 처리방침",
    file: "legal/privacy-2026-09-01.txt",
    changeSummary:
      "수집 항목, 위치정보 처리 방식, 처리위탁 업체, 보관 기간을 명시했습니다",
    // 최초 발행이라 시행일을 버전일과 같게 둠. KST 기준 자정
    effectiveAt: new Date("2026-09-01T00:00:00+09:00"),
  },
];

const publish = process.argv.includes("--publish");

function loadBody(file) {
  const body = readFileSync(path.join(here, file), "utf8");
  // 깨진 본문이 다시 들어가는 것을 넣기 전에 막음
  if (body.includes("�")) {
    throw new Error(`${file} 에 대체 문자가 있습니다. 파일 인코딩을 확인해 주십시오`);
  }
  if (body.trim().length === 0) throw new Error(`${file} 이 비어 있습니다`);
  return body;
}

const sql = postgres(DATABASE_URL);

try {
  for (const doc of DOCUMENTS) {
    const body = loadBody(doc.file);
    const status = publish ? "published" : "draft";
    // 발행본은 시행일이 있어야 함. 없으면 DB CHECK 가 막으므로 미리 알림
    const effectiveAt = publish ? (doc.effectiveAt ?? new Date()) : doc.effectiveAt;

    const [row] = await sql`
      insert into legal_documents
        (doc_type, version, status, title, body, change_summary, effective_at, published_at)
      values
        (${doc.docType}, ${doc.version}, ${status}, ${doc.title}, ${body},
         ${doc.changeSummary}, ${effectiveAt}, ${publish ? new Date() : null})
      on conflict (doc_type, version) do update set
        title = excluded.title,
        body = excluded.body,
        change_summary = excluded.change_summary,
        status = excluded.status,
        effective_at = excluded.effective_at,
        published_at = excluded.published_at
      returning version, status, length(body) as len
    `;
    console.log(`${doc.docType} ${row.version} ${row.status} ${row.len}자`);
  }
} finally {
  await sql.end();
}
