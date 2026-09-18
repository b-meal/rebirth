import { logFailure } from "@rebirth/core/http";
import { createSignedThumbUrls } from "@rebirth/core/storage";
import {
  countUnreadAreaReports,
  countUnreadMatchAlerts,
  listMapReports,
} from "@rebirth/db";
import { LIST_PERIOD_DAYS } from "@rebirth/types";

import { getCurrentUser } from "@/lib/auth/session";
import { sinceLabel } from "@/lib/report-label";
import { HomeScreen, type MapMarker } from "@/components/home/home-screen";

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

    // 비공개 버킷이라 서명이 필요하고 여러 제보가 같은 사진을 가리켜 경로를 접음
    const paths = [...new Set(rows.flatMap((row) => (row.photoPath ? [row.photoPath] : [])))];
    const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

    return rows.map((row) => ({
      id: row.id,
      animalType: row.animalType,
      colors: row.colors,
      size: row.size,
      careSituation: row.careSituation,
      injury: row.injury,
      areaName: row.areaName,
      // 질의가 두 종류만 고르므로 보호소 입소는 여기 오지 않음
      kind: row.kind as "sighting" | "lost",
      petName: row.petName,
      sinceLabel: sinceLabel(row.occurredAt),
      occurredAt: row.occurredAt.toISOString(),
      photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
      point: { lat: row.coarsePoint!.y, lng: row.coarsePoint!.x },
    }));
  } catch (error) {
    // 핀이 하나도 없는 첫 화면과 질의가 깨진 첫 화면은 눈으로 구별되지 않음
    logFailure("home.markers", error);
    return [];
  }
}

/** 알림 버튼에 찍을 점. 로그인 전이거나 구독과 실종 신고가 없으면 0 */
async function loadUnread(userId: string | undefined): Promise<number> {
  if (!userId) return 0;
  try {
    // 동네 새 제보와 내 신고에 닮은 제보를 한 숫자로 합침. 알림함이 한 화면이라 배지도 하나
    const [areas, matches] = await Promise.all([
      countUnreadAreaReports(userId),
      countUnreadMatchAlerts(userId),
    ]);
    return areas + matches;
  } catch (error) {
    logFailure("home.unread", error);
    return 0;
  }
}

export default async function HomePage() {
  // 쿠키 읽기는 렌더 중에 끝내야 함. 약속에 넣어 흘려보내면 요청 범위를 벗어나 실패함
  const user = await getCurrentUser().catch(() => undefined);

  // 질의만 약속으로 넘김, 마커를 기다리느라 화면이 늦게 뜨면 덮개보다 로딩 표시가 먼저 보임
  return <HomeScreen markers={loadMarkers()} unread={loadUnread(user?.id)} />;
}
