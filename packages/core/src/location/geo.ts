// 좌표 가공. 외부 호출이 없어 서버와 클라이언트 양쪽에서 씀

export type LatLng = { lat: number; lng: number };

// 카카오 로컬 API 서비스 범위. 밖의 좌표는 호출 전에 걸러냄
export const KOREA_BOUNDS = {
  minLat: 33,
  maxLat: 38.7,
  minLng: 124.5,
  maxLng: 132,
} as const;

// 공개용 격자 크기. 300m 기본, 신원이 드러나기 쉬운 제보는 1km
export const COARSE_GRID_METERS = { default: 300, wide: 1000 } as const;

export type CoarseGridMeters =
  (typeof COARSE_GRID_METERS)[keyof typeof COARSE_GRID_METERS];

const EARTH_RADIUS_KM = 6371;
const METERS_PER_LAT_DEGREE = 111_320;
const RAD = Math.PI / 180;

export function isInKorea({ lat, lng }: LatLng): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= KOREA_BOUNDS.minLat &&
    lat <= KOREA_BOUNDS.maxLat &&
    lng >= KOREA_BOUNDS.minLng &&
    lng <= KOREA_BOUNDS.maxLng
  );
}

// 소수점 7자리는 약 1cm. 격자 값에 부동소수 잔여가 남지 않게 자름
const round7 = (v: number) => Math.round(v * 1e7) / 1e7;

// 셀 경계가 아니라 셀 중심으로 옮겨 원래 좌표를 역산할 수 없게 함
const snapAxis = (value: number, step: number) =>
  round7((Math.floor(value / step) + 0.5) * step);

export function snapToGrid(
  { lat, lng }: LatLng,
  meters: number = COARSE_GRID_METERS.default,
): LatLng {
  const latStep = meters / METERS_PER_LAT_DEGREE;
  const snappedLat = snapAxis(lat, latStep);
  // 경도 1도의 실거리는 고위도로 갈수록 줄어 위도 보정이 필요
  // 보정 기준을 원본이 아니라 스냅된 위도로 잡아야 같은 셀의 좌표가 같은 격자를 씀
  const lngStep = latStep / Math.max(Math.cos(snappedLat * RAD), 0.01);
  return { lat: snappedLat, lng: snapAxis(lng, lngStep) };
}

// 품종견 추정과 어린 개체, 부상 제보는 반경을 넓혀 특정 가능성을 낮춤
export function coarseGridMetersFor(input: {
  visibleInjury?: boolean | null;
  young?: boolean | null;
  pedigreeSuspected?: boolean | null;
}): CoarseGridMeters {
  const wide =
    input.visibleInjury === true ||
    input.young === true ||
    input.pedigreeSuspected === true;
  return wide ? COARSE_GRID_METERS.wide : COARSE_GRID_METERS.default;
}

// 공개되는 격자 셀 중심은 원본에서 최대 대각선 절반만큼 떨어짐
// 그 거리를 반경으로 그리면 실제 공개 지점이 반드시 원 안에 들어옴
export function coarseRadiusMeters(gridMeters: number): number {
  return Math.round((gridMeters * Math.SQRT2) / 2);
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// PostGIS geography 리터럴. 경도가 앞에 오는 순서를 한곳에서만 다룸
export function toWkt({ lat, lng }: LatLng): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
