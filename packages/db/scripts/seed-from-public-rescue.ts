// 국가동물보호정보시스템 보호중 공고를 발견 제보로 넣는 스크립트

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

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
for (const key of [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "KAKAO_REST_API_KEY",
  "ANTHROPIC_API_KEY",
  "DATA_GO_KR_API_KEY",
]) {
  if (!env[key]) throw new Error(`${key} 가 없습니다`);
}

const WANT = Number(process.env.WANT ?? "300");
const STATES = (process.env.STATES ?? "protect").split(",").filter(Boolean);

// 크레딧을 아껴야 할 때 공고가 이미 적어 둔 값만으로 채움
const NO_AI = process.env.NO_AI === "1";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? "5");
const STORAGE = `${env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1`;
const PHOTO_BUCKET = "report-photos";

// 다른 시드와 겹치지 않는 대역
const ID_PREFIX = "00000000-0000-4000-8000-3";

const GEO_CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".rescue-geo.json");
const ENDPOINT = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";

const METERS_PER_LAT_DEGREE = 111_320;
const RAD = Math.PI / 180;
const round7 = (v: number) => Math.round(v * 1e7) / 1e7;
const snapAxis = (value: number, step: number) => round7((Math.floor(value / step) + 0.5) * step);

function snapToGrid({ lat, lng }: { lat: number; lng: number }, meters: number) {
  const latStep = meters / METERS_PER_LAT_DEGREE;
  const snappedLat = snapAxis(lat, latStep);
  const lngStep = latStep / Math.max(Math.cos(snappedLat * RAD), 0.01);
  return { lat: snappedLat, lng: snapAxis(lng, lngStep) };
}

type Notice = {
  desertionNo: string;
  happenDt: string;
  happenPlace: string;
  kindNm: string;
  upKindNm: string;
  colorCd: string;
  weight: string;
  sexCd: string;
  neuterYn: string;
  specialMark: string;
  popfile1: string;
  noticeNo?: string;
  careNm: string;
  careAddr: string;
  orgNm: string;
};

async function fetchNotices(want: number): Promise<Notice[]> {
  const rows: Notice[] = [];
  const seen = new Set<string>();
  for (const state of STATES) {
    for (let page = 1; rows.length < want && page <= 80; page += 1) {
      const url = new URL(ENDPOINT);
      url.searchParams.set("serviceKey", env.DATA_GO_KR_API_KEY!);
      url.searchParams.set("numOfRows", "100");
      url.searchParams.set("pageNo", String(page));
      url.searchParams.set("state", state);
      url.searchParams.set("_type", "json");
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      const json = (await res.json()) as { response: { body: { items: { item?: unknown } } } };
      const raw = json.response.body.items.item;
      const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Notice[];
      if (items.length === 0) break;
      for (const item of items) {
        if (!item.popfile1 || seen.has(item.desertionNo)) continue;
        seen.add(item.desertionNo);
        rows.push(item);
        if (rows.length >= want) break;
      }
    }
  }
  return rows;
}

async function kakao(pathname: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`https://dapi.kakao.com${pathname}?${query}`, {
        headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) return (await res.json()) as { documents?: Record<string, string>[] };
    } catch {
      // 다음 시도로 넘김
    }
  }
  return null;
}

const geoCache: Record<string, { lat: number; lng: number } | null> = existsSync(GEO_CACHE)
  ? JSON.parse(readFileSync(GEO_CACHE, "utf8"))
  : {};

/** 발견 장소를 먼저 찾고 못 찾으면 보호소 주소로 물러남 */
async function geocode(notice: Notice): Promise<{ lat: number; lng: number } | null> {
  for (const query of [notice.happenPlace, notice.careAddr]) {
    if (!query) continue;
    if (query in geoCache) {
      if (geoCache[query]) return geoCache[query]!;
      continue;
    }
    const body =
      (await kakao("/v2/local/search/address.json", { query })) ??
      (await kakao("/v2/local/search/keyword.json", { query }));
    const doc = body?.documents?.[0];
    const point = doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;
    geoCache[query] = point;
    if (point) return point;
  }
  return null;
}

async function resolveArea(point: { lat: number; lng: number }) {
  const body = await kakao("/v2/local/geo/coord2regioncode.json", {
    x: String(point.lng),
    y: String(point.lat),
  });
  const region = body?.documents?.find((d) => d.region_type === "H") ?? body?.documents?.[0];
  if (!region) return null;
  return {
    code: region.code!,
    name: [region.region_1depth_name, region.region_2depth_name, region.region_3depth_name]
      .filter(Boolean)
      .join(" "),
  };
}

async function uploadPhoto(objectPath: string, body: Buffer) {
  const res = await fetch(`${STORAGE}/object/${PHOTO_BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "image/jpeg",
      "x-upsert": "true",
    },
    body: body as unknown as BodyInit,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`업로드 ${res.status}`);
}

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });

async function analyze(bytes: Buffer) {
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
              source: { type: "base64", media_type: "image/jpeg", data: bytes.toString("base64") },
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

const SIZE_BY_KG = (weight: string) => {
  const kg = Number((weight.match(/([\d.]+)/) ?? [])[1]);
  if (!Number.isFinite(kg) || kg <= 0) return "unknown" as const;
  if (kg < 10) return "small" as const;
  if (kg < 25) return "medium" as const;
  return "large" as const;
};

const COLOR_WORDS: Record<string, string[]> = {
  흰색: ["흰", "백", "크림", "아이보리", "화이트"],
  검정색: ["검", "흑", "블랙"],
  갈색: ["갈", "브라운", "초코", "베이지", "치즈", "황", "주황"],
  회색: ["회", "그레이", "실버"],
};

function colorsOf(colorCd: string): string[] {
  const out = new Set<string>();
  for (const [word, keys] of Object.entries(COLOR_WORDS)) {
    if (keys.some((k) => colorCd.includes(k))) out.add(word);
  }
  return out.size > 0 ? [...out] : [];
}

/** 공고가 적어 둔 값만 옮김, 사진을 읽지 않으므로 ai_model 을 비워 둠 */
function draftFromNotice(notice: Notice) {
  const animalType =
    notice.upKindNm.includes("개") ? "dog" : notice.upKindNm.includes("고양이") ? "cat" : "other";
  const breed = notice.kindNm.replace(/^\[[^\]]+\]\s*/, "").trim();
  const colors = colorsOf(notice.colorCd);
  const size = SIZE_BY_KG(notice.weight);
  const parts = [
    [colors.join(" "), notice.colorCd].filter(Boolean)[0],
    breed && breed !== "믹스견" && breed !== "믹스묘" ? `${breed} 계열` : "",
  ].filter(Boolean);
  const head = parts.join(" ") || "외형 정보가 공고에 적혀 있지 않음";
  const mark = (notice.specialMark ?? "").trim();
  return {
    animalType: animalType as "dog" | "cat" | "other",
    breedGuess: breed && !breed.startsWith("믹스") ? breed : null,
    appearance: [head, mark].filter(Boolean).join("\n\n").slice(0, 500),
    color: colors,
    size,
    collarOrHarness: null as boolean | null,
    visibleInjury: null as boolean | null,
    earTip: null as boolean | null,
    warnings: [] as string[],
  };
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

function noticeId(desertionNo: string): string {
  const hex = createHash("sha1").update(desertionNo).digest("hex").slice(0, 11);
  return `${ID_PREFIX}${hex}`;
}

function occurredAt(happenDt: string): Date {
  const matched = happenDt.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!matched) return new Date();
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]), 12, 0, 0);
}

const notices = await fetchNotices(WANT);
process.stdout.write(`보호중 공고 ${notices.length}건 수집\n`);

const sql = postgres(env.DATABASE_URL!.replace(":5432/", ":6543/"), {
  prepare: false,
  max: 3,
  connect_timeout: 20,
});

const analyzedRows = await sql<{ id: string }[]>`
  select id from reports where id::text like ${`${ID_PREFIX}%`} and ai_model is not null
`;
const analyzed = new Set(analyzedRows.map((row) => row.id));
process.stdout.write(`초안이 이미 붙은 공고 ${analyzed.size}건은 건너뜀\n`);

let done = 0;
let skipped = 0;
let failed = 0;

try {
  await runPool(notices, CONCURRENCY, async (notice) => {
    const id = noticeId(notice.desertionNo);
    if (!NO_AI && analyzed.has(id)) {
      skipped += 1;
      return;
    }
    try {
      const point = await geocode(notice);
      if (!point) {
        skipped += 1;
        return;
      }
      const res = await fetch(notice.popfile1, { signal: AbortSignal.timeout(25_000) });
      if (!res.ok) throw new Error(`사진 ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());

      const draft = NO_AI ? draftFromNotice(notice) : await analyze(bytes);
      // 사진에서 동물을 찾지 못한 공고는 넣지 않음
      if (draft.animalType === "unknown") {
        skipped += 1;
        return;
      }

      const objectPath = `public-rescue/${notice.desertionNo}.jpg`;
      await uploadPhoto(objectPath, bytes);

      const grid = draft.visibleInjury === true ? 1000 : 300;
      const coarse = snapToGrid(point, grid);
      const area = await resolveArea(point);
      const appearance = [draft.appearance, draft.story].filter(Boolean).join("\n\n").slice(0, 500);
      const source = `국가동물보호정보시스템 공고 ${notice.noticeNo ?? notice.desertionNo}, ${notice.careNm}`;

      await sql`
        insert into reports (
          id, kind, visibility, lifecycle, care_situation, animal_type, breed_guess, appearance,
          colors, size, sex, neutered, condition_tags, collar, injury, ear_tip,
          coarse_point, coarse_grid_m, location_source,
          area_code_system, area_code, area_name, landmark_note, occurred_at,
          ai_model, ai_analyzed_at
        ) values (
          ${id}, 'sighting', 'public', 'active', 'in_care', ${draft.animalType},
          ${draft.breedGuess}, ${appearance},
          ${draft.color}, ${draft.size},
          ${notice.sexCd === "M" ? "male" : notice.sexCd === "F" ? "female" : "unknown"},
          ${notice.neuterYn === "Y" ? "done" : notice.neuterYn === "N" ? "not_done" : "unknown"},
          ${draft.warnings.slice(0, 3)},
          ${draft.collarOrHarness}, ${draft.visibleInjury}, ${draft.earTip},
          ST_SetSRID(ST_MakePoint(${coarse.lng}, ${coarse.lat}), 4326), ${grid}, 'manual_area',
          ${area ? "H" : null}, ${area?.code ?? null}, ${area?.name ?? null},
          ${source.slice(0, 100)}, ${occurredAt(notice.happenDt)},
          ${NO_AI ? null : VISION_MODEL}, ${NO_AI ? null : new Date()}
        )
        on conflict (id) do update set
          animal_type = excluded.animal_type, breed_guess = excluded.breed_guess,
          appearance = excluded.appearance, colors = excluded.colors, size = excluded.size,
          coarse_point = excluded.coarse_point, area_name = excluded.area_name,
          landmark_note = excluded.landmark_note, occurred_at = excluded.occurred_at,
          collar = excluded.collar, injury = excluded.injury, ear_tip = excluded.ear_tip,
          condition_tags = excluded.condition_tags,
          ai_model = excluded.ai_model, ai_analyzed_at = excluded.ai_analyzed_at
      `;
      await sql`
        insert into report_photos (report_id, storage_path, sort_order)
        values (${id}, ${objectPath}, 0)
        on conflict do nothing
      `;
      done += 1;
      if (done % 25 === 0) process.stdout.write(`  ${done}건\n`);
    } catch (error) {
      failed += 1;
      if (failed <= 5) process.stderr.write(`실패 ${notice.desertionNo} ${String(error).slice(0, 90)}\n`);
    }
  });

  writeFileSync(GEO_CACHE, JSON.stringify(geoCache));
  process.stdout.write(`\n넣음 ${done}건, 건너뜀 ${skipped}건, 실패 ${failed}건\n`);
  process.stdout.write(`지우려면 delete from reports where id::text like '${ID_PREFIX}%'\n`);
} finally {
  await sql.end();
}
