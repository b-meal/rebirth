import "server-only";

import type { LocationCandidate } from "./candidate";
import { isInKorea, type LatLng } from "./geo";
import {
  KAKAO_CATEGORY_GROUPS,
  type KakaoCategoryGroupCode,
} from "./kakao-categories";

// 카카오 로컬 API 6종의 단일 진입점. 키 주입과 에러 정규화, 타임아웃을 한곳에서 처리

const BASE_URL = "https://dapi.kakao.com/v2/local";
// 카테고리 검색은 반경 없이는 결과가 비어 옴
const CATEGORY_DEFAULT_RADIUS_METERS = 2000;
const TIMEOUT_MS = 3000;

export type KakaoLocalErrorKind =
  | "no-key"
  | "unauthorized"
  | "map-disabled"
  | "quota"
  | "out-of-service"
  | "timeout"
  | "http"
  | "network";

export class KakaoLocalError extends Error {
  constructor(
    readonly kind: KakaoLocalErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KakaoLocalError";
  }
}

type QueryValue = string | number | boolean | undefined;

// 좌표는 메시지와 로그에 남기지 않음. 위치 보호 원칙
async function kakaoLocal<T>(
  path: string,
  params: Record<string, QueryValue>,
): Promise<T> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new KakaoLocalError("no-key", "KAKAO_REST_API_KEY 가 없습니다");
  }

  const url = new URL(`${BASE_URL}/${path}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === "TimeoutError";
    throw new KakaoLocalError(
      timedOut ? "timeout" : "network",
      timedOut
        ? `카카오 로컬 API 응답이 ${TIMEOUT_MS}ms 를 넘었습니다`
        : "카카오 로컬 API 에 연결하지 못했습니다",
    );
  }

  if (!response.ok) throw toError(response, await safeText(response));
  return (await response.json()) as T;
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function toError(response: Response, body: string): KakaoLocalError {
  const { status } = response;
  // REST 키만으로는 403. 카카오 콘솔 제품 설정에서 카카오맵을 켜야 로컬 API 가 열림
  if (status === 403 && body.includes("OPEN_MAP_AND_LOCAL")) {
    return new KakaoLocalError(
      "map-disabled",
      "카카오 콘솔의 제품 설정에서 카카오맵이 꺼져 있습니다",
      status,
    );
  }
  if (status === 401) {
    return new KakaoLocalError(
      "unauthorized",
      "카카오 REST API 키가 유효하지 않습니다",
      status,
    );
  }
  if (status === 403) {
    return new KakaoLocalError(
      "map-disabled",
      "카카오 앱 설정에서 이 API 가 허용되지 않았습니다",
      status,
    );
  }
  if (status === 429) {
    return new KakaoLocalError(
      "quota",
      "카카오 로컬 API 일일 쿼터를 넘었습니다",
      status,
    );
  }
  return new KakaoLocalError(
    "http",
    `카카오 로컬 API 가 ${status} 를 반환했습니다`,
    status,
  );
}

function assertInService(point: LatLng): void {
  if (!isInKorea(point)) {
    throw new KakaoLocalError(
      "out-of-service",
      "카카오 로컬 API 서비스 범위를 벗어난 좌표입니다",
    );
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(value)));

// 카카오는 x 가 경도, y 가 위도. 순서를 뒤집는 실수를 이 파일 밖으로 내보내지 않음
const toXY = ({ lat, lng }: LatLng) => ({ x: lng, y: lat });
const fromXY = (x: string | number, y: string | number): LatLng => ({
  lat: Number(y),
  lng: Number(x),
});

export { KAKAO_CATEGORY_GROUPS, type KakaoCategoryGroupCode };


export type KakaoPage = {
  totalCount: number;
  pageableCount: number;
  isEnd: boolean;
};

type RawMeta = {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
};

const toPage = (meta: RawMeta): KakaoPage => ({
  totalCount: meta.total_count,
  pageableCount: meta.pageable_count,
  isEnd: meta.is_end,
});

/* 좌표 → 행정구역 (coord2regioncode) */

export type KakaoRegion = {
  areaName: string;
  fullName: string;
  sido: string;
  sigungu: string;
  dong: string;
  ri: string;
  code: string;
  regionType: "H" | "B";
};

type RawRegion = {
  region_type: "H" | "B";
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  region_4depth_name: string;
  code: string;
};

export async function coord2Region(
  point: LatLng,
  options: { regionType?: "H" | "B" } = {},
): Promise<KakaoRegion | null> {
  assertInService(point);
  const { documents } = await kakaoLocal<{ documents: RawRegion[] }>(
    "geo/coord2regioncode.json",
    toXY(point),
  );
  // H 가 행정동, B 가 법정동. area_name 에는 행정동을 씀
  const wanted = options.regionType ?? "H";
  const document =
    documents.find((d) => d.region_type === wanted) ?? documents[0];
  if (!document) return null;
  return {
    areaName: document.region_3depth_name,
    fullName: document.address_name,
    sido: document.region_1depth_name,
    sigungu: document.region_2depth_name,
    dong: document.region_3depth_name,
    ri: document.region_4depth_name,
    code: document.code,
    regionType: document.region_type,
  };
}

/* 좌표 → 주소 (coord2address) */

export type KakaoAddress = {
  roadAddress: string | null;
  jibunAddress: string | null;
  buildingName: string | null;
  postalCode: string | null;
  areaName: string;
};

type RawJibun = {
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
};

type RawRoad = {
  address_name: string;
  building_name: string;
  zone_no: string;
  region_3depth_name: string;
};

export async function coord2Address(point: LatLng): Promise<KakaoAddress | null> {
  assertInService(point);
  const { documents } = await kakaoLocal<{
    documents: { road_address: RawRoad | null; address: RawJibun | null }[];
  }>("geo/coord2address.json", toXY(point));
  const document = documents[0];
  if (!document) return null;
  const { road_address: road, address: jibun } = document;
  return {
    roadAddress: road?.address_name ?? null,
    jibunAddress: jibun?.address_name ?? null,
    buildingName: road?.building_name || null,
    postalCode: road?.zone_no || null,
    areaName: jibun?.region_3depth_name ?? road?.region_3depth_name ?? "",
  };
}

/* 주소 → 좌표 (search/address) */

export type KakaoAddressMatch = {
  point: LatLng;
  addressName: string;
  roadAddressName: string | null;
  buildingName: string | null;
  postalCode: string | null;
  areaName: string;
  addressType: string;
};

type RawAddressDocument = {
  address_name: string;
  address_type: string;
  x: string;
  y: string;
  address: (RawJibun & { region_3depth_h_name?: string }) | null;
  road_address: RawRoad | null;
};

export async function searchAddress(
  query: string,
  options: { page?: number; size?: number; analyzeType?: "similar" | "exact" } = {},
): Promise<{ page: KakaoPage; matches: KakaoAddressMatch[] }> {
  const { meta, documents } = await kakaoLocal<{
    meta: RawMeta;
    documents: RawAddressDocument[];
  }>("search/address.json", {
    query,
    page: clamp(options.page ?? 1, 1, 45),
    size: clamp(options.size ?? 10, 1, 30),
    analyze_type: options.analyzeType,
  });
  return {
    page: toPage(meta),
    matches: documents.map((d) => ({
      point: fromXY(d.x, d.y),
      addressName: d.address_name,
      roadAddressName: d.road_address?.address_name ?? null,
      buildingName: d.road_address?.building_name || null,
      postalCode: d.road_address?.zone_no || null,
      areaName:
        d.address?.region_3depth_h_name ||
        d.address?.region_3depth_name ||
        d.road_address?.region_3depth_name ||
        "",
      addressType: d.address_type,
    })),
  };
}

/* 장소 검색 (search/keyword, search/category) */

export type KakaoPlace = {
  id: string;
  name: string;
  category: string;
  categoryGroupCode: KakaoCategoryGroupCode | "";
  categoryGroupName: string;
  phone: string;
  addressName: string;
  roadAddressName: string;
  point: LatLng;
  distanceMeters: number | null;
  placeUrl: string;
};

type RawPlace = {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: KakaoCategoryGroupCode | "";
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance?: string;
};

export type PlaceSearchOptions = {
  center?: LatLng;
  radiusMeters?: number;
  categoryGroupCode?: KakaoCategoryGroupCode;
  sort?: "accuracy" | "distance";
  page?: number;
  size?: number;
};

const toPlace = (d: RawPlace): KakaoPlace => ({
  id: d.id,
  name: d.place_name,
  category: d.category_name,
  categoryGroupCode: d.category_group_code,
  categoryGroupName: d.category_group_name,
  phone: d.phone,
  addressName: d.address_name,
  roadAddressName: d.road_address_name,
  point: fromXY(d.x, d.y),
  distanceMeters: d.distance ? Number(d.distance) : null,
  placeUrl: d.place_url,
});

// distance 정렬과 반경은 중심 좌표가 있을 때만 유효하고 반경 상한은 20000m
// 반경을 기본값으로 넣으면 먼 곳을 검색어로 찾을 수 없어 넘겨받은 경우에만 보냄
function toSearchParams(
  options: PlaceSearchOptions,
  defaultRadiusMeters?: number,
): Record<string, QueryValue> {
  const center = options.center ? toXY(options.center) : undefined;
  const radius = options.radiusMeters ?? defaultRadiusMeters;
  return {
    x: center?.x,
    y: center?.y,
    radius:
      center && radius !== undefined ? clamp(radius, 0, 20_000) : undefined,
    sort: center ? options.sort : undefined,
    page: clamp(options.page ?? 1, 1, 45),
    size: clamp(options.size ?? 15, 1, 15),
  };
}

export async function searchKeyword(
  query: string,
  options: PlaceSearchOptions = {},
): Promise<{ page: KakaoPage; places: KakaoPlace[] }> {
  const { meta, documents } = await kakaoLocal<{
    meta: RawMeta;
    documents: RawPlace[];
  }>("search/keyword.json", {
    query,
    category_group_code: options.categoryGroupCode,
    ...toSearchParams(options),
  });
  return { page: toPage(meta), places: documents.map(toPlace) };
}

export async function searchCategory(
  categoryGroupCode: KakaoCategoryGroupCode,
  options: PlaceSearchOptions & { center: LatLng },
): Promise<{ page: KakaoPage; places: KakaoPlace[] }> {
  const { meta, documents } = await kakaoLocal<{
    meta: RawMeta;
    documents: RawPlace[];
  }>("search/category.json", {
    category_group_code: categoryGroupCode,
    ...toSearchParams(options, CATEGORY_DEFAULT_RADIUS_METERS),
  });
  return { page: toPage(meta), places: documents.map(toPlace) };
}

/* 좌표계 변환 (transcoord) */

export type KakaoCoordSystem =
  | "WGS84"
  | "WCONGNAMUL"
  | "CONGNAMUL"
  | "WTM"
  | "TM"
  | "KTM"
  | "UTM"
  | "BESSEL"
  | "WKTM"
  | "WUTM";

export async function transcoord(
  point: LatLng,
  from: KakaoCoordSystem,
  to: KakaoCoordSystem,
): Promise<{ x: number; y: number } | null> {
  const { documents } = await kakaoLocal<{ documents: { x: number; y: number }[] }>(
    "geo/transcoord.json",
    { ...toXY(point), input_coord: from, output_coord: to },
  );
  return documents[0] ?? null;
}

/* 검색 결과를 화면이 쓰는 공통 형태로 옮김 */

export function placeToCandidate(place: KakaoPlace): LocationCandidate {
  return {
    id: place.id,
    name: place.name,
    detail: place.roadAddressName || place.addressName,
    point: place.point,
    // 장소 검색 응답에는 행정동이 없어 지번 주소의 세 번째 조각으로 대신함
    areaName: place.addressName.split(" ")[2] ?? "",
    distanceMeters: place.distanceMeters,
    phone: place.phone || null,
    placeUrl: place.placeUrl || null,
    category: place.category || null,
  };
}

export function addressToCandidate(
  match: KakaoAddressMatch,
  index: number,
): LocationCandidate {
  return {
    // 주소 검색 응답에는 식별자가 없어 순번으로 만듦
    id: `address-${index}-${match.addressName}`,
    name: match.buildingName || match.addressName,
    detail: match.roadAddressName || match.addressName,
    point: match.point,
    areaName: match.areaName,
    distanceMeters: null,
    phone: null,
    placeUrl: null,
    category: null,
  };
}
