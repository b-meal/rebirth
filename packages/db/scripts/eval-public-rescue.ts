// 국가동물보호정보시스템 공고 사진으로 AI 초안 정확도를 재는 스크립트

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Anthropic from "/Users/hahmjuntae/Desktop/workspace/b-meal/rebirth/node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.5.4/node_modules/@anthropic-ai/sdk/index.js";
import { zodOutputFormat } from "/Users/hahmjuntae/Desktop/workspace/b-meal/rebirth/node_modules/.pnpm/@anthropic-ai+sdk@0.124.0_zod@4.5.4/node_modules/@anthropic-ai/sdk/helpers/zod.js";
import { analyzeResult } from "../../types/src/analyze.ts";

import { SYSTEM, PROMPT, VISION_MODEL } from "../../core/src/vision/prompt.ts";
import { bareBreed } from "../../core/src/reports/breed.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readEnvFile(file: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]!] = match[2]!.trim().replace(/^["'](.*)["']$/, "$1");
  }
  return env;
}

const env = readEnvFile(path.join(repoRoot, ".env.local"));
if (!env.DATA_GO_KR_API_KEY) throw new Error("DATA_GO_KR_API_KEY 가 없습니다");
if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 가 없습니다");

const SAMPLE = Number(process.env.SAMPLE ?? "30");
const CONCURRENCY = Number(process.env.CONCURRENCY ?? "4");
const OUT_FILE = path.join(repoRoot, "packages/db/scripts/.rescue-eval.json");
const ENDPOINT =
  "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";

type Notice = {
  desertionNo: string;
  kindNm: string;
  colorCd: string;
  weight: string;
  sexCd: string;
  neuterYn: string;
  specialMark: string;
  popfile1: string;
  orgNm: string;
  upKindNm: string;
};

// 공고가 축종을 따로 주므로 품종명에서 글자를 찾지 않음
function truthAnimalType(upKindNm: string): "dog" | "cat" | "other" {
  if (upKindNm.includes("개")) return "dog";
  if (upKindNm.includes("고양이")) return "cat";
  return "other";
}

// 공고 무게로 크기를 나눔, 화면의 소중대 기준과 같은 칸을 씀
function truthSize(weight: string): "small" | "medium" | "large" | "unknown" {
  const kg = Number((weight.match(/([\d.]+)/) ?? [])[1]);
  if (!Number.isFinite(kg) || kg <= 0) return "unknown";
  if (kg < 10) return "small";
  if (kg < 25) return "medium";
  return "large";
}

// 공고 표기와 모델 표기를 같은 칸으로 모음, 한쪽만 줄이면 맞는 답도 틀리게 셈
const COLOR_WORDS: Record<string, string[]> = {
  흰색: ["흰", "백", "크림", "아이보리", "화이트"],
  검정색: ["검", "흑", "블랙"],
  갈색: ["갈", "브라운", "초코", "베이지", "치즈", "황", "주황", "오렌지", "탄"],
  회색: ["회", "그레이", "실버"],
};

function normalizeColors(value: string | string[]): string[] {
  const text = Array.isArray(value) ? value.join(" ") : value;
  const out = new Set<string>();
  for (const [word, keys] of Object.entries(COLOR_WORDS)) {
    if (keys.some((k) => text.includes(k))) out.add(word);
  }
  return [...out];
}

async function fetchNotices(want: number): Promise<Notice[]> {
  const rows: Notice[] = [];
  for (let page = 1; rows.length < want && page <= 20; page += 1) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("serviceKey", env.DATA_GO_KR_API_KEY!);
    url.searchParams.set("numOfRows", "100");
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("_type", "json");
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const json = (await res.json()) as Record<string, never>;
    const raw = (json as never as { response: { body: { items: { item?: unknown } } } })
      .response.body.items.item;
    const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Notice[];
    if (items.length === 0) break;
    for (const item of items) {
      if (!item.popfile1) continue;
      rows.push(item);
      if (rows.length >= want) break;
    }
  }
  return rows;
}

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });

async function analyze(bytes: Buffer, mediaType: string) {
  const response = await client.messages.parse(
    {
      model: VISION_MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg", data: bytes.toString("base64") },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(analyzeResult) },
    },
    { timeout: 30_000 },
  );
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("스키마로 읽지 못함");
  return { ...parsed, breedGuess: bareBreed(parsed.breedGuess) };
}

async function runPool<T>(items: T[], size: number, worker: (item: T, i: number) => Promise<void>) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await worker(items[index]!, index);
      }
    }),
  );
}

const notices = await fetchNotices(SAMPLE);
process.stdout.write(`공고 ${notices.length}건 수집\n`);

type Row = {
  desertionNo: string;
  truth: { animalType: string; size: string; colors: string[]; kindNm: string; colorCd: string };
  draft: { animalType: string; size: string; colors: string[]; breedGuess: string | null; confidence: number } | null;
  latencyMs: number;
  error?: string;
};

const results: Row[] = [];
let done = 0;

await runPool(notices, CONCURRENCY, async (notice) => {
  const truth = {
    animalType: truthAnimalType(notice.upKindNm),
    size: truthSize(notice.weight),
    colors: normalizeColors(notice.colorCd),
    kindNm: notice.kindNm,
    colorCd: notice.colorCd,
  };
  const started = Date.now();
  try {
    // 공고 사진은 http 로만 열려 있어 그대로 받음
    const res = await fetch(notice.popfile1, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`사진 ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const mediaType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    const draft = await analyze(bytes, mediaType.startsWith("image/") ? mediaType : "image/jpeg");
    results.push({
      desertionNo: notice.desertionNo,
      truth,
      draft: {
        animalType: draft.animalType,
        size: draft.size,
        colors: normalizeColors(draft.color),
        breedGuess: draft.breedGuess,
        confidence: draft.confidence,
      },
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    results.push({
      desertionNo: notice.desertionNo,
      truth,
      draft: null,
      latencyMs: Date.now() - started,
      error: String(error).slice(0, 120),
    });
  }
  done += 1;
  if (done % 10 === 0) process.stdout.write(`  ${done}/${notices.length}\n`);
});

const ok = results.filter((r) => r.draft);
const hit = (pick: (r: Row) => boolean) =>
  ok.length === 0 ? 0 : Math.round((ok.filter(pick).length / ok.length) * 1000) / 10;

const typeAcc = hit((r) => r.draft!.animalType === r.truth.animalType);
const sizeRows = ok.filter((r) => r.truth.size !== "unknown");
const sizeAcc =
  sizeRows.length === 0
    ? 0
    : Math.round((sizeRows.filter((r) => r.draft!.size === r.truth.size).length / sizeRows.length) * 1000) / 10;
const ORDER = ["small", "medium", "large"];
const sizeNear =
  sizeRows.length === 0
    ? 0
    : Math.round(
        (sizeRows.filter((r) => Math.abs(ORDER.indexOf(r.draft!.size) - ORDER.indexOf(r.truth.size)) <= 1).length /
          sizeRows.length) *
          1000,
      ) / 10;
const colorRows = ok.filter((r) => r.truth.colors.length > 0);
const colorAcc =
  colorRows.length === 0
    ? 0
    : Math.round(
        (colorRows.filter((r) => r.truth.colors.some((c) => r.draft!.colors.includes(c))).length /
          colorRows.length) *
          1000,
      ) / 10;
const latency = ok.length === 0 ? 0 : Math.round(ok.reduce((a, r) => a + r.latencyMs, 0) / ok.length);
const conf = ok.length === 0 ? 0 : Math.round((ok.reduce((a, r) => a + r.draft!.confidence, 0) / ok.length) * 100) / 100;

const summary = {
  sampled: results.length,
  analyzed: ok.length,
  failed: results.length - ok.length,
  animalTypeAccuracy: typeAcc,
  sizeAccuracy: sizeAcc,
  sizeNearAccuracy: sizeNear,
  sizeBase: sizeRows.length,
  colorRecall: colorAcc,
  colorBase: colorRows.length,
  avgLatencyMs: latency,
  avgConfidence: conf,
  measuredAt: new Date().toISOString(),
};

const history = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : [];
history.push({ summary, results });
writeFileSync(OUT_FILE, JSON.stringify(history, null, 2));

process.stdout.write(`\n표본 ${summary.sampled}건, 분석 ${summary.analyzed}건, 실패 ${summary.failed}건\n`);
process.stdout.write(`축종 일치 ${typeAcc}%\n`);
process.stdout.write(`크기 일치 ${sizeAcc}%, 한 칸 차이까지 ${sizeNear}% (무게가 있는 ${sizeRows.length}건 기준)\n`);
process.stdout.write(`털색 일치 ${colorAcc}% (색 표기가 있는 ${colorRows.length}건 기준)\n`);
process.stdout.write(`평균 ${latency}ms, 평균 확신도 ${conf}\n`);
