import { createSignedThumbUrls } from "@rebirth/core/storage";
import { listMapReports } from "@rebirth/db";
import { LIST_PERIOD_DAYS } from "@rebirth/types";

import { sinceLabel } from "@/lib/report-label";
import { HomeScreen, type MapMarker } from "@/components/home/home-screen";
import { SplashOverlay } from "@/components/ui/splash-overlay";

// 마커는 격자 좌표만 서버에서 읽어 넘김, 정확 좌표는 공개 응답과 이 화면에 넣지 않음

// 새 제보가 바로 지도에 올라와야 해 캐시하지 않음
export const dynamic = "force-dynamic";

// 지도에 올릴 조회 기간, 목록의 확장 기간과 같은 30일
const MAP_DAYS = LIST_PERIOD_DAYS[1];

async function loadMarkers(): Promise<MapMarker[]> {
  try {
    const since = new Date(Date.now() - MAP_DAYS * 86_400_000);
    const rows = (await listMapReports({ fromOccurredAt: since })).filter(
      (row) => row.coarsePoint !== null,
    );

    // 비공개 버킷이라 서명이 필요하고 카드와 핀이 같은 축소본을 함께 씀
    const paths = rows.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
    const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

    return rows.map((row) => ({
      id: row.id,
      animalType: row.animalType,
      colors: row.colors,
      size: row.size,
      careSituation: row.careSituation,
      injury: row.injury,
      areaName: row.areaName,
      sinceLabel: sinceLabel(row.occurredAt),
      photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
      point: { lat: row.coarsePoint!.y, lng: row.coarsePoint!.x },
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  return (
    <>
      <HomeScreen markers={await loadMarkers()} />
      {/* 덮개가 걷히는 동안 아래에서 지도가 먼저 준비됨 */}
      <SplashOverlay />
    </>
  );
}
