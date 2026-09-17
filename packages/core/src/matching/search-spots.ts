// 예측 원 위의 탐색 지점 배점. 반경에 가까울수록 우선

import { distanceKm, type LatLng } from "../location/geo.ts";
import type { KakaoPlace } from "../location/kakao-local.ts";

export const SPOT_KEYWORDS = {
  공원: 1.0,
  하천: 1.0,
  산책로: 0.9,
  학교: 0.7,
  아파트: 0.7,
} as const;

export const SPOT_LIMIT = 4;

export type SpotKeyword = keyof typeof SPOT_KEYWORDS;

export type SpotCandidate = {
  name: string;
  point: LatLng;
  keyword: SpotKeyword;
};

export type Spot = SpotCandidate & { priority: number };

export function rankSpots({
  candidates,
  center,
  radiusKm,
}: {
  candidates: SpotCandidate[];
  center: LatLng;
  radiusKm: number;
}): Spot[] {
  const best = new Map<string, Spot>();
  for (const candidate of candidates) {
    const gap = Math.abs(distanceKm(center, candidate.point) - radiusKm);
    const priority = SPOT_KEYWORDS[candidate.keyword] / (1 + gap / radiusKm);
    const kept = best.get(candidate.name);
    // 같은 이름의 지점이 여러 키워드로 걸려 높은 쪽만 남김
    if (!kept || priority > kept.priority) {
      best.set(candidate.name, { ...candidate, priority });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, SPOT_LIMIT);
}

// ponytail: 요청마다 Kakao 5회 호출, 느려지면 격자 키로 캐시
export async function searchSpots({
  center,
  radiusKm,
}: {
  center: LatLng;
  radiusKm: number;
}): Promise<Spot[]> {
  try {
    // kakao-local 은 server-only 라 테스트에서 걸리지 않게 호출 시점에만 동적 import
    const { searchKeyword } = await import("../location/kakao-local.ts");
    const keywords = Object.keys(SPOT_KEYWORDS) as SpotKeyword[];
    const settled = await Promise.allSettled(
      keywords.map((keyword) =>
        searchKeyword(keyword, {
          center,
          radiusMeters: radiusKm * 1000,
          size: 5,
        }),
      ),
    );
    const candidates = settled.flatMap((result, index) =>
      result.status === "fulfilled"
        ? result.value.places.map(
            ({ name, point }: KakaoPlace): SpotCandidate => ({
              name,
              point,
              keyword: keywords[index]!,
            }),
          )
        : [],
    );
    return rankSpots({ candidates, center, radiusKm });
  } catch {
    // KakaoLocalError 를 포함한 모든 실패에서 빈 목록. 경로 화면은 지점 없이도 그려짐
    return [];
  }
}
