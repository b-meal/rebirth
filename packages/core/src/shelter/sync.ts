import "server-only";

import { upsertShelters } from "@rebirth/db";

import {
  SHELTER_ENDPOINTS,
  extractRows,
  extractTotalCount,
  normalizeCareCenter,
  normalizeWildlifeCenter,
  readResultCode,
  type NormalizedShelter,
} from "./public-data.ts";

// 공공데이터포털 동기화. 하루 1만 건 한도라 상시 호출하지 않고 운영자가 돌림
// 키는 인코딩되지 않은 일반 인증키(Decoding)를 넣음. URLSearchParams 가 다시 인코딩함

// 500 이상을 주면 856 건 중 338 건만 돌려주고 2 페이지가 비어 옴. 100 이 상한
const PAGE_SIZE = 100;
// 전국 규모가 이 아래라 무한 루프를 막는 상한으로만 씀
const MAX_PAGES = 50;
const TIMEOUT_MS = 15_000;

export type SyncOutcome = {
  kind: NormalizedShelter["kind"];
  /** 공공데이터가 알려 준 전체 건수. fetched 와 다르면 덜 받은 것임 */
  total: number;
  fetched: number;
  saved: number;
  skipped: number;
  withPoint: number;
};

export class ShelterSyncError extends Error {
  constructor(
    message: string,
    readonly reason: "no_key" | "upstream" | "rejected",
  ) {
    super(message);
    this.name = "ShelterSyncError";
  }
}

// 응답 형식 파라미터 이름이 서로 다르고 모르는 이름을 주면 10 으로 거절함
const SOURCES = {
  care_center: {
    endpoint: SHELTER_ENDPOINTS.careCenter,
    formatParam: "_type",
    normalize: normalizeCareCenter,
  },
  wildlife_center: {
    endpoint: SHELTER_ENDPOINTS.wildlifeCenter,
    formatParam: "type",
    normalize: normalizeWildlifeCenter,
  },
} as const;

async function fetchPage(
  source: (typeof SOURCES)[keyof typeof SOURCES],
  serviceKey: string,
  pageNo: number,
): Promise<unknown> {
  const url = new URL(source.endpoint);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(PAGE_SIZE));
  url.searchParams.set(source.formatParam, "json");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new ShelterSyncError(
      `공공데이터 응답이 ${response.status} 입니다`,
      "upstream",
    );
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    // 키가 틀리면 XML 오류 문서가 200 으로 오므로 본문 앞부분만 남김
    throw new ShelterSyncError(
      `공공데이터가 JSON 이 아닌 응답을 돌려줬습니다: ${text.slice(0, 120)}`,
      "rejected",
    );
  }

  const code = readResultCode(payload);
  if (code !== null && code !== "00" && code !== "0") {
    throw new ShelterSyncError(
      `공공데이터가 요청을 거절했습니다 (resultCode=${code})`,
      "rejected",
    );
  }
  return payload;
}

async function collect(
  source: (typeof SOURCES)[keyof typeof SOURCES],
  serviceKey: string,
): Promise<{ rows: NormalizedShelter[]; fetched: number; total: number }> {
  const rows: NormalizedShelter[] = [];
  // 같은 기관이 여러 페이지에 겹쳐 오면 마지막 값만 남김
  const seen = new Set<string>();
  let fetched = 0;
  let total = Number.POSITIVE_INFINITY;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await fetchPage(source, serviceKey, page);
    const raw = extractRows(payload);
    if (raw.length === 0) break;

    fetched += raw.length;
    if (page === 1) total = extractTotalCount(payload) || raw.length;

    for (const item of raw) {
      const row = source.normalize(item);
      if (row === null || seen.has(row.externalId)) continue;
      seen.add(row.externalId);
      rows.push(row);
    }
    if (fetched >= total) break;
  }

  if (fetched < total) {
    console.warn(`[shelters] ${total} 건 중 ${fetched} 건만 받음`);
  }
  return { rows, fetched, total: Number.isFinite(total) ? total : fetched };
}

// geometry 열이 위경도가 아니라 x y 순서를 받음
function toInsert(row: NormalizedShelter) {
  const { point, ...rest } = row;
  return { ...rest, point: point ? { x: point.lng, y: point.lat } : null };
}

/** 한 출처를 내려받아 저장함. 부분 실패를 남기지 않도록 출처 단위로 처리함 */
export async function syncShelterSource(
  kind: NormalizedShelter["kind"],
): Promise<SyncOutcome> {
  const serviceKey = process.env.PUBLIC_DATA_API_KEY;
  if (!serviceKey) {
    throw new ShelterSyncError("PUBLIC_DATA_API_KEY 가 없습니다", "no_key");
  }

  const { rows, fetched, total } = await collect(SOURCES[kind], serviceKey);

  // 한 번에 넣으면 파라미터 한도에 걸려 끊어서 넣음
  let saved = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map(toInsert);
    const result = await upsertShelters(chunk);
    saved += result.length;
  }

  return {
    kind,
    total,
    fetched,
    saved,
    skipped: fetched - rows.length,
    withPoint: rows.filter((row) => row.point !== null).length,
  };
}

export async function syncAllShelters(): Promise<SyncOutcome[]> {
  return [
    await syncShelterSource("care_center"),
    await syncShelterSource("wildlife_center"),
  ];
}
