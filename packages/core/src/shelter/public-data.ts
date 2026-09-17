import { isInKorea, type LatLng } from "../location/geo.ts";

// 공공데이터포털 보호·구조 기관 API 정규화
// 두 API 는 소관 부처가 달라 같은 뜻의 열 이름이 서로 다름. 후보 목록으로 흡수함

export const SHELTER_ENDPOINTS = {
  // 농림축산검역본부 전국동물보호센터정보표준데이터
  careCenter: "https://apis.data.go.kr/1543061/animalShelterSrvc_v2/shelterInfo_v2",
  // 환경부 전국야생동물구조센터정보표준데이터
  wildlifeCenter: "https://api.data.go.kr/openapi/tn_pubr_public_wlres_cnter_api",
} as const;

export type ShelterSourceKind = "care_center" | "wildlife_center";

export type NormalizedShelter = {
  kind: ShelterSourceKind;
  externalId: string;
  name: string;
  orgName: string | null;
  targetAnimals: string | null;
  roadAddress: string | null;
  lotAddress: string | null;
  point: LatLng | null;
  tel: string | null;
  weekdayOpen: string | null;
  weekdayClose: string | null;
  weekendOpen: string | null;
  weekendClose: string | null;
  closedDay: string | null;
  vetCount: number | null;
  keeperCount: number | null;
  dataDate: string | null;
};

type Row = Record<string, unknown>;

// 빈 값이 공백과 하이픈과 해당없음 세 가지로 섞여 옴
function pick(row: Row, ...names: string[]): string | null {
  for (const name of names) {
    const value = row[name];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text !== "" && text !== "-" && text !== "해당없음") return text;
  }
  return null;
}

function pickCount(row: Row, ...names: string[]): number | null {
  const text = pick(row, ...names);
  if (text === null) return null;
  const parsed = Number.parseInt(text.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// 0900 과 09:00 과 9 가 섞여 옴. 화면에 그대로 찍도록 HH:MM 으로 맞춤
export function normalizeTime(raw: string | null): string | null {
  if (raw === null) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 4) {
    const hour = digits.slice(0, 2);
    const minute = digits.slice(2);
    return Number(hour) <= 24 && Number(minute) < 60 ? `${hour}:${minute}` : null;
  }
  if (digits.length === 3) {
    const minute = digits.slice(1);
    return Number(minute) < 60 ? `0${digits.slice(0, 1)}:${minute}` : null;
  }
  if (digits.length === 1 || digits.length === 2) {
    const hour = Number(digits);
    return hour <= 24 ? `${String(hour).padStart(2, "0")}:00` : null;
  }
  return null;
}

// 위경도가 뒤집힌 행이 있어 국내 범위로 한 번 거르고 뒤집힌 쪽도 받아 줌
function toPoint(latRaw: string | null, lngRaw: string | null): LatLng | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (isInKorea({ lat, lng })) return { lat, lng };
  if (isInKorea({ lat: lng, lng: lat })) return { lat: lng, lng: lat };
  return null;
}

// 번호를 별표로 가린 행이 있어 숫자가 없으면 전화 버튼을 걸지 않음
export function cleanTel(raw: string | null): string | null {
  if (raw === null) return null;
  return /[0-9]{2,}/.test(raw) ? raw : null;
}

// 휴무일 없음을 0 과 없음 과 연중무휴 세 가지로 써서 셋 다 빈 값으로 봄
export function cleanClosedDay(raw: string | null): string | null {
  if (raw === null) return null;
  const text = raw.trim();
  // 1 과 2 같은 숫자만 든 값이 섞여 있는데 무슨 요일인지 알 수 없어 버림
  if (/^[0-9]+$/.test(text)) return null;
  return text === "없음" || text === "연중무휴" ? null : text;
}

// 등록번호가 비어 오는 행이 있어 이름과 주소를 붙여 대체 키로 씀
function fallbackId(name: string, address: string | null): string {
  return `${name}|${address ?? ""}`.replace(/\s+/g, "").slice(0, 200);
}

export function normalizeCareCenter(row: Row): NormalizedShelter | null {
  const name = pick(row, "careNm", "care_nm", "shelterNm", "animalShelterNm");
  if (name === null) return null;
  const roadAddress = pick(row, "careAddr", "care_addr", "rdnmadr", "roadAddr");
  return {
    kind: "care_center",
    externalId:
      pick(row, "careRegNo", "care_reg_no", "shelterRegNo") ??
      fallbackId(name, roadAddress),
    name,
    orgName: pick(row, "orgNm", "org_nm", "jurisdictionInst", "insttNm"),
    targetAnimals: pick(row, "saveTrgtAnimal", "saveTrgtAnimalNm", "divisionNm"),
    roadAddress,
    lotAddress: pick(row, "jibunAddr", "lnmadr", "lotAddr"),
    point: toPoint(
      pick(row, "lat", "latitude"),
      pick(row, "lng", "lon", "longitude"),
    ),
    tel: cleanTel(pick(row, "careTel", "care_tel", "phoneNumber", "tel")),
    weekdayOpen: normalizeTime(pick(row, "weekOprStime", "weekdayOperOpenHhmm")),
    weekdayClose: normalizeTime(pick(row, "weekOprEtime", "weekdayOperCloseHhmm")),
    weekendOpen: normalizeTime(pick(row, "weekendOprStime", "weekendOperOpenHhmm")),
    weekendClose: normalizeTime(pick(row, "weekendOprEtime", "weekendOperCloseHhmm")),
    closedDay: cleanClosedDay(pick(row, "closeDay", "rstdeInfo", "restDay")),
    vetCount: pickCount(row, "vetPersonCnt", "vetNope", "veterinarianCo"),
    keeperCount: pickCount(row, "specsPersonCnt", "specsPersonNope", "specialistCo"),
    dataDate: pick(row, "dataStdDt", "referenceDate", "updTm"),
  };
}

export function normalizeWildlifeCenter(row: Row): NormalizedShelter | null {
  const name = pick(row, "wlresCnterNm", "cnterNm", "instiNm", "institutionNm");
  if (name === null) return null;
  const roadAddress = pick(row, "rdnmadr", "roadNmAddr");
  return {
    kind: "wildlife_center",
    externalId: fallbackId(name, roadAddress),
    name,
    orgName: pick(row, "insttNm", "institutionNm", "operInstitutionNm"),
    // 원문에 구조대상 열이 없음. 화면 문구를 맞추려고 고정값을 넣음
    targetAnimals: "야생동물",
    roadAddress,
    lotAddress: pick(row, "lnmadr", "lotnoAddr"),
    point: toPoint(
      pick(row, "latitude", "lat"),
      pick(row, "longitude", "lng"),
    ),
    tel: cleanTel(pick(row, "phoneNumber", "tel", "rprsntvTelno")),
    weekdayOpen: normalizeTime(pick(row, "operOpenHhmm", "operStartTime")),
    weekdayClose: normalizeTime(
      pick(row, "operColseHhmm", "operCloseHhmm", "operEndTime"),
    ),
    weekendOpen: null,
    weekendClose: null,
    closedDay: cleanClosedDay(pick(row, "rstde", "rstdeInfo", "restDeInfo", "closeDay")),
    vetCount: pickCount(row, "vtrinrnCo", "veterinarianCo", "vetPersonCnt"),
    keeperCount: pickCount(row, "dissRsrchrCo", "diseaseResercherCo"),
    dataDate: pick(row, "referenceDate", "dataStdDt"),
  };
}

// 검역본부는 response 로 한 겹 감싸고 환경부는 감싸지 않아 둘 다 받음
function unwrap(payload: unknown): Record<string, unknown> | undefined {
  const root = payload as { response?: Record<string, unknown> } | undefined;
  if (root === null || root === undefined) return undefined;
  return root.response ?? (root as Record<string, unknown>);
}

// items 가 배열일 때와 item 한 겹이 더 있을 때가 섞여 있고 단건은 객체로 옴
export function extractRows(payload: unknown): Row[] {
  const body = unwrap(payload)?.body;
  const items = (body as { items?: unknown } | undefined)?.items;
  const raw = Array.isArray(items)
    ? items
    : ((items as { item?: unknown } | undefined)?.item ?? null);
  if (raw === null || raw === undefined) return [];
  return (Array.isArray(raw) ? raw : [raw]) as Row[];
}

export function extractTotalCount(payload: unknown): number {
  const body = unwrap(payload)?.body as { totalCount?: unknown } | undefined;
  const parsed = Number(body?.totalCount);
  return Number.isFinite(parsed) ? parsed : 0;
}

// 인증 실패와 한도 초과가 200 본문으로 와서 헤더를 따로 봐야 함
export function readResultCode(payload: unknown): string | null {
  const header = unwrap(payload)?.header as Record<string, unknown> | undefined;
  if (header === undefined) return null;
  return pick(header, "resultCode", "returnReasonCode");
}
