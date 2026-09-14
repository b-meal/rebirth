import "server-only";

import { extractRows, extractTotalCount, readResultCode } from "./public-data.ts";

// 국가동물보호정보시스템 구조동물 조회 서비스
// 품종 코드와 행정 코드는 표준 대조용이고 공고는 집계만 남김

const BASE = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2";

// 100 을 넘겨도 100 까지만 돌려줌
const PAGE_SIZE = 100;
// 공고는 7천여 건이라 여유를 둔 상한
const MAX_PAGES = 200;
const TIMEOUT_MS = 20_000;

/** 상위 축종 코드. 품종 목록을 받으려면 이 값을 하나씩 넣어야 함 */
export const UP_KINDS = [
  { code: "417000", name: "개" },
  { code: "422400", name: "고양이" },
  { code: "429900", name: "기타" },
] as const;

export class RescueDataError extends Error {
  constructor(
    message: string,
    readonly reason: "no_key" | "upstream" | "rejected",
  ) {
    super(message);
    this.name = "RescueDataError";
  }
}

function serviceKey(): string {
  const key = process.env.DATA_GO_KR_API_KEY;
  if (!key) throw new RescueDataError("DATA_GO_KR_API_KEY 가 없습니다", "no_key");
  return key;
}

async function call(
  operation: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${BASE}/${operation}`);
  url.searchParams.set("serviceKey", serviceKey());
  url.searchParams.set("_type", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new RescueDataError(`응답이 ${response.status} 입니다`, "upstream");
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    // 키가 틀리면 XML 오류 문서가 200 으로 옴
    throw new RescueDataError(
      `JSON 이 아닌 응답입니다: ${text.slice(0, 120)}`,
      "rejected",
    );
  }

  const code = readResultCode(payload);
  if (code !== null && code !== "00" && code !== "0") {
    throw new RescueDataError(`요청이 거절됐습니다 (resultCode=${code})`, "rejected");
  }
  return payload;
}

type Row = Record<string, unknown>;

const text = (row: Row, key: string): string =>
  row[key] === undefined || row[key] === null ? "" : String(row[key]).trim();

export type KindRow = {
  kindCd: string;
  kindNm: string;
  upKindCd: string;
  upKindNm: string;
};

/** 축종별 품종 코드. 개만 200종이 넘어 상위 코드별로 따로 받음 */
export async function fetchKinds(): Promise<KindRow[]> {
  const rows: KindRow[] = [];
  for (const up of UP_KINDS) {
    // numOfRows 를 주지 않으면 기본 한 쪽만 와서 개 206종 중 10종만 들어옴
    const payload = await call("kind_v2", { up_kind_cd: up.code, numOfRows: "1000" });
    for (const item of extractRows(payload)) {
      const kindCd = text(item, "kindCd");
      const kindNm = text(item, "knm") || text(item, "kindNm");
      if (!kindCd || !kindNm) continue;
      rows.push({ kindCd, kindNm, upKindCd: up.code, upKindNm: up.name });
    }
  }
  return rows;
}

export type RegionRow = { orgCd: string; orgNm: string; parentCd: string | null };

/**
 * 시도와 그 아래 시군구. 시군구는 시도 코드를 넣어야 나옴
 * 시군구 목록에 시도 자신이 다시 들어오고 코드가 겹치는 줄도 있어 하나만 남김
 */
export async function fetchRegions(): Promise<RegionRow[]> {
  const byCode = new Map<string, RegionRow>();

  const sido = extractRows(await call("sido_v2", { numOfRows: "100" }));
  for (const item of sido) {
    const orgCd = text(item, "orgCd");
    const orgNm = text(item, "orgdownNm");
    if (!orgCd || !orgNm) continue;
    byCode.set(orgCd, { orgCd, orgNm, parentCd: null });
  }

  const parents = [...byCode.values()];
  for (const parent of parents) {
    const sigungu = extractRows(
      await call("sigungu_v2", { upr_cd: parent.orgCd, numOfRows: "100" }),
    );
    for (const item of sigungu) {
      const orgCd = text(item, "orgCd");
      const orgNm = text(item, "orgdownNm");
      // 시도 줄을 시군구가 덮어쓰면 상위가 사라짐
      if (!orgCd || !orgNm || byCode.has(orgCd)) continue;
      byCode.set(orgCd, { orgCd, orgNm, parentCd: parent.orgCd });
    }
  }

  return [...byCode.values()];
}

export type StatRow = {
  sidoCd: string;
  sidoNm: string;
  upKindNm: string;
  processState: string;
  total: number;
};

export type StatsOutcome = {
  fetched: number;
  reported: number;
  rows: StatRow[];
};

/**
 * 공고 전량을 훑어 시도와 축종과 처리상태로 묶음
 * 개체 정보를 저장하지 않으므로 여기서 세고 버림
 */
export async function collectRescueStats(
  regions: RegionRow[],
): Promise<StatsOutcome> {
  // 공고는 시도 코드를 주지 않고 관할 기관명만 주므로 이름으로 되짚음
  const sidoByName = new Map(
    regions.filter((row) => row.parentCd === null).map((row) => [row.orgNm, row.orgCd]),
  );

  const buckets = new Map<string, StatRow>();
  let fetched = 0;
  let reported = 0;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await call("abandonmentPublic_v2", {
      numOfRows: String(PAGE_SIZE),
      pageNo: String(page),
    });
    const items = extractRows(payload);
    if (items.length === 0) break;
    if (page === 1) reported = extractTotalCount(payload);
    fetched += items.length;

    for (const item of items) {
      const orgNm = text(item, "orgNm");
      // 세종특별자치시 처럼 시도가 곧 관할인 곳과 경기도 수원시 처럼 두 단계인 곳이 섞임
      const sidoNm =
        [...sidoByName.keys()].find((name) => orgNm.startsWith(name)) ?? "(미상)";
      const sidoCd = sidoByName.get(sidoNm) ?? "0";
      const upKindNm = text(item, "upKindNm") || "(미상)";
      const processState = text(item, "processState") || "(미상)";

      const key = `${sidoCd}|${upKindNm}|${processState}`;
      const found = buckets.get(key);
      if (found) found.total += 1;
      else buckets.set(key, { sidoCd, sidoNm, upKindNm, processState, total: 1 });
    }

    if (fetched >= reported && reported > 0) break;
  }

  return { fetched, reported, rows: [...buckets.values()] };
}
