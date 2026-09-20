import { logFailure } from "../http/log";
import "server-only";

import type { LocationCandidate } from "./candidate";
import { snapToGrid } from "./geo";
import {
  KakaoLocalError,
  addressToCandidate,
  coord2Address,
  coord2Region,
  placeToCandidate,
  searchAddress,
  searchCategory,
  searchKeyword,
} from "./kakao-local";
import { fieldErrors, geocodeRequestSchema, placeSearchSchema } from "./schema";

// 위치 API 의 라우트 핸들러. web 과 admin 이 각자 route.ts 에서 재수출해 씀
// NextResponse 대신 표준 Response 를 써서 이 패키지가 next 에 묶이지 않게 함

const FALLBACK_MESSAGE =
  "현재 위치를 가져오지 못했습니다. 동이나 면을 직접 선택해 주십시오";

const BY_KIND: Record<string, { status: number; message: string }> = {
  "no-key": { status: 502, message: FALLBACK_MESSAGE },
  unauthorized: { status: 502, message: FALLBACK_MESSAGE },
  "map-disabled": { status: 502, message: FALLBACK_MESSAGE },
  quota: { status: 503, message: "잠시 후에 다시 시도해 주십시오" },
  "out-of-service": {
    status: 400,
    message: "국내에서 목격한 위치만 등록할 수 있습니다",
  },
  timeout: { status: 504, message: FALLBACK_MESSAGE },
  network: { status: 502, message: FALLBACK_MESSAGE },
  http: { status: 502, message: FALLBACK_MESSAGE },
};

// 카카오 실패를 화면에 그대로 쓸 문구로 옮김. 원인은 서버 로그에만 남김
export function kakaoErrorResponse(error: unknown): Response {
  if (error instanceof KakaoLocalError) {
    const mapped = BY_KIND[error.kind] ?? {
      status: 502,
      message: FALLBACK_MESSAGE,
    };
    // 좌표는 남기지 않음
    logFailure("location.kakao", error.message, {
      kind: error.kind,
      status: error.status ?? "",
    });
    return Response.json(
      { message: mapped.message, reason: error.kind },
      { status: mapped.status },
    );
  }
  logFailure("location.kakao.unexpected", error);
  return Response.json(
    { message: FALLBACK_MESSAGE, reason: "unknown" },
    { status: 500 },
  );
}

/* POST /api/geocode 좌표를 행정동명으로. 입력 좌표는 응답에 되돌려주지 않음 */

export async function geocodeHandler(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json(
      { message: "요청 본문이 올바르지 않습니다" },
      { status: 400 },
    );
  }

  const parsed = geocodeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        message: "위치 정보가 올바르지 않습니다",
        errors: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const { lat, lng, regionType, withAddress } = parsed.data;
  const point = { lat, lng };

  try {
    const [region, address] = await Promise.all([
      coord2Region(point, { regionType }),
      withAddress ? coord2Address(point) : Promise.resolve(null),
    ]);

    if (!region) {
      return Response.json(
        { message: "행정동을 찾지 못했습니다. 동이나 면을 직접 선택해 주십시오" },
        { status: 404 },
      );
    }

    return Response.json({
      areaName: region.areaName,
      fullName: region.fullName,
      sido: region.sido,
      sigungu: region.sigungu,
      code: region.code,
      // 특징 입력 전이라 기본 격자. 제보 저장 시 부상·어린 개체면 넓힘
      coarsePoint: snapToGrid(point),
      // 도로명 주소가 없는 좌표가 있어 지번 주소를 함께 돌려줌
      roadAddress: address?.roadAddress ?? null,
      jibunAddress: address?.jibunAddress ?? null,
      buildingName: address?.buildingName ?? null,
    });
  } catch (error) {
    return kakaoErrorResponse(error);
  }
}

/**
 * 같은 지점이 주소와 장소로 두 번 걸린 것을 하나로 줄임
 * 좌표를 소수점 다섯 자리로 끊음. 대략 1m 라 같은 건물은 같은 열쇠가 됨
 * 앞에 온 것을 남겨 주소가 장소보다 먼저 서게 함
 */
function dedupeByPoint(items: LocationCandidate[]): LocationCandidate[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.point.lat.toFixed(5)},${item.point.lng.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* GET /api/places 장소·주소 검색. REST 키가 서버 전용이라 브라우저는 이 라우트를 거침 */

export async function placesHandler(request: Request): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = placeSearchSchema.safeParse(query);
  if (!parsed.success) {
    return Response.json(
      {
        message: "검색 조건이 올바르지 않습니다",
        errors: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const { mode, category, lat, lng, radius, sort, page, size } = parsed.data;
  const center = lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
  const options = { center, radiusMeters: radius, sort, page, size };

  try {
    if (mode === "address") {
      const result = await searchAddress(parsed.data.query ?? "", { page, size });
      return Response.json({
        mode,
        page: result.page,
        items: result.matches.map(addressToCandidate),
      });
    }

    // 주소와 장소명을 함께 찾음. 한쪽이 비어도 다른 쪽 결과를 내보냄
    // 동 이름을 적으면 주소가, 강남역을 적으면 장소가 걸림
    if (mode === "both") {
      const text = parsed.data.query ?? "";
      const [address, keyword] = await Promise.allSettled([
        searchAddress(text, { page, size }),
        searchKeyword(text, options),
      ]);

      // 둘 다 실패했을 때만 오류로 돌림. 하나만 실패하면 나머지로 답함
      if (address.status === "rejected" && keyword.status === "rejected") {
        return kakaoErrorResponse(address.reason);
      }

      const items = [
        // 적어 넣은 것이 주소면 그것이 가장 정확한 답이라 앞에 둠
        ...(address.status === "fulfilled"
          ? address.value.matches.map(addressToCandidate)
          : []),
        ...(keyword.status === "fulfilled" ? keyword.value.places.map(placeToCandidate) : []),
      ];

      return Response.json({
        mode,
        // 더 볼 것이 있는지는 장소 쪽이 정함. 주소는 대개 한 쪽이면 끝남
        page:
          keyword.status === "fulfilled"
            ? keyword.value.page
            : (address as PromiseFulfilledResult<Awaited<ReturnType<typeof searchAddress>>>)
                .value.page,
        items: dedupeByPoint(items),
      });
    }

    if (mode === "category") {
      if (!category || !center) {
        return Response.json(
          { message: "카테고리 검색은 카테고리와 중심 좌표가 필요합니다" },
          { status: 400 },
        );
      }
      const result = await searchCategory(category, { ...options, center });
      return Response.json({
        mode,
        page: result.page,
        items: result.places.map(placeToCandidate),
      });
    }

    const result = await searchKeyword(parsed.data.query ?? "", {
      ...options,
      categoryGroupCode: category,
    });
    return Response.json({
      mode,
      page: result.page,
      items: result.places.map(placeToCandidate),
    });
  } catch (error) {
    return kakaoErrorResponse(error);
  }
}
