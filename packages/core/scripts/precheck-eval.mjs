// 1단계 선검사 평가. 오거부율을 0 으로 맞춘 뒤에야 검출률을 봄
//
// 사용법
//   pnpm --filter @rebirth/core eval:precheck <표본 폴더>
//
// 표본 폴더 구조. 저장소에 넣지 않고 로컬에만 둠
//   <폴더>/animal/*      실제 제보 사진. 여기서 no 가 나오면 오거부
//   <폴더>/not-animal/*  셀카·화면 캡처·풍경 같은 오입력. 여기서 no 가 나와야 검출
//
// 파일명 앞의 `라벨_` 은 범주로 묶어 표에 따로 적음

import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

import {
  PRECHECK_MAX_EDGE,
  PRECHECK_MODEL,
  precheckRequest,
  readVerdict,
} from "../src/vision/precheck-prompt.ts";

// 한 번에 띄우는 요청 수. 레이트리밋에 걸리지 않을 만큼만 둠
const CONCURRENCY = 6;

// Haiku 4.5 단가(USD per MTok). 비용을 눈으로 확인하려는 용도
const PRICE = { input: 1, output: 5 };

const root = process.argv[2];
if (!root) {
  console.error("표본 폴더를 넘겨 주십시오");
  process.exit(1);
}

loadEnv();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 });

const cases = [
  ...listCases(join(root, "animal"), true),
  ...listCases(join(root, "not-animal"), false),
];
if (cases.length === 0) {
  console.error("표본이 없습니다");
  process.exit(1);
}

console.log(`모델 ${PRECHECK_MODEL} · 긴 변 ${PRECHECK_MAX_EDGE}px · 표본 ${cases.length}장\n`);

const results = await mapWithLimit(cases, CONCURRENCY, run);

report(results);

/* ── 실행 ────────────────────────────────────────────────── */

async function run(item) {
  const buffer = await sharp(item.path)
    .resize({ width: PRECHECK_MAX_EDGE, height: PRECHECK_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const startedAt = Date.now();
  try {
    const response = await client.messages.create(
      precheckRequest({ base64: buffer.toString("base64"), mediaType: "image/jpeg" }),
    );
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return {
      ...item,
      animalPresent: readVerdict(text),
      raw: text.trim(),
      latencyMs: Date.now() - startedAt,
      usage: response.usage,
      kb: Math.round(buffer.length / 1024),
    };
  } catch (error) {
    // 호출 실패는 통과로 다루는 것이 배포 동작이라 평가도 같게 셈
    return {
      ...item,
      animalPresent: true,
      raw: `ERROR ${error?.message ?? error}`,
      latencyMs: Date.now() - startedAt,
      failed: true,
      kb: Math.round(buffer.length / 1024),
    };
  }
}

/* ── 집계 ────────────────────────────────────────────────── */

function report(rows) {
  const animals = rows.filter((row) => row.expected);
  const others = rows.filter((row) => !row.expected);

  const falseRejects = animals.filter((row) => !row.animalPresent);
  const detected = others.filter((row) => !row.animalPresent);
  const failures = rows.filter((row) => row.failed);

  console.log("범주별");
  for (const [label, group] of groupBy(rows)) {
    const hit = group.filter((row) => row.animalPresent === row.expected).length;
    console.log(`  ${label.padEnd(16)} ${String(hit).padStart(2)}/${String(group.length).padStart(2)} 정답`);
  }

  console.log("\n핵심 지표");
  console.log(`  오거부  ${falseRejects.length}/${animals.length}  (${pct(falseRejects.length, animals.length)})  ← 0 이어야 함`);
  console.log(`  검출    ${detected.length}/${others.length}  (${pct(detected.length, others.length)})`);
  if (failures.length > 0) console.log(`  호출 실패 ${failures.length}건 (통과로 셈)`);

  if (falseRejects.length > 0) {
    console.log("\n오거부 목록");
    for (const row of falseRejects) console.log(`  ${row.name}  → "${row.raw}"`);
  }

  const missed = others.filter((row) => row.animalPresent);
  if (missed.length > 0) {
    console.log("\n걸러내지 못한 오입력");
    for (const row of missed) console.log(`  ${row.name}  → "${row.raw}"`);
  }

  const latencies = rows.map((row) => row.latencyMs).sort((a, b) => a - b);
  console.log("\n지연");
  console.log(`  p50 ${quantile(latencies, 0.5)}ms · p95 ${quantile(latencies, 0.95)}ms · 최대 ${latencies.at(-1)}ms`);

  const used = rows.filter((row) => row.usage);
  if (used.length > 0) {
    const input = sum(used.map((row) => row.usage.input_tokens));
    const output = sum(used.map((row) => row.usage.output_tokens));
    const usd = (input / 1e6) * PRICE.input + (output / 1e6) * PRICE.output;
    console.log("\n한 장당");
    console.log(`  입력 ${Math.round(input / used.length)} · 출력 ${Math.round(output / used.length)} 토큰`);
    console.log(`  전송 ${Math.round(sum(rows.map((row) => row.kb)) / rows.length)}KB · 비용 $${(usd / used.length).toFixed(6)}`);
  }
}

/* ── 도구 ────────────────────────────────────────────────── */

function listCases(dir, expected) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .map((name) => ({
      path: join(dir, name),
      name: basename(name),
      expected,
      label: `${expected ? "동물" : "그 외"}/${categoryOf(name)}`,
    }));
}

/** 파일명 앞의 `라벨_` 을 범주로 씀. 일련번호로 시작하면 그다음 조각을 봄 */
function categoryOf(name) {
  const parts = name.replace(/\.[^.]+$/, "").split("_");
  return parts.find((part) => part !== "" && !/^\d+$/.test(part)) ?? "기타";
}

async function mapWithLimit(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        out[index] = await worker(items[index]);
        process.stdout.write(`\r  ${++done}/${items.length} 판정`);
      }
    }),
  );
  process.stdout.write("\r".padEnd(30) + "\r");
  return out;
}

function groupBy(rows) {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.label) ?? [];
    list.push(row);
    map.set(row.label, list);
  }
  return [...map].sort(([a], [b]) => a.localeCompare(b));
}

// report 가 최상위에서 먼저 불려 화살표 상수로 두면 초기화 전 접근이 됨
function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function pct(part, total) {
  return total === 0 ? "-" : `${((part / total) * 100).toFixed(1)}%`;
}

function quantile(sorted, q) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}

function loadEnv() {
  if (process.env.ANTHROPIC_API_KEY) return;
  for (const path of ["../../.env.local", "../../../.env.local"]) {
    try {
      for (const line of readFileSync(new URL(path, import.meta.url), "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (match) process.env[match[1]] ??= match[2].trim().replace(/^["'](.*)["']$/, "$1");
      }
    } catch {
      // 다음 후보 경로로 넘어감
    }
  }
}
