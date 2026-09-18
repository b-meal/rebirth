import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { attachPhotoUrls } from "@rebirth/core/reports";
import { listAreaSubscriptions, listMatchAlerts } from "@rebirth/db";
import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { getCurrentUser } from "@/lib/auth/session";
import {
  NotificationList,
  type MatchAlertItem,
} from "@/components/mine/notification-list";
import { encodeAreaReportCursor, readNotificationPage } from "./notification-page";

// REQ-019 를 앱 안 알림함으로만 제공하는 화면
// 구독한 동네에 올라온 제보를 모아 보여 주고 안 읽은 것에만 점을 붙임

export const metadata: Metadata = {
  title: "알림",
  // 구독 동네가 사는 곳을 드러내므로 색인하지 않음
  robots: { index: false, follow: false },
};

// 새 제보가 바로 보여야 해 캐시하지 않음
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=%2Fmine%2Fnotifications`);
  }

  const [areas, matchRows] = await Promise.all([
    listAreaSubscriptions(user.id).catch(() => []),
    // 내 실종 신고와 닮아 올라온 제보. 신고가 없으면 빈 배열이라 화면이 절을 감춤
    listMatchAlerts(user.id).catch(() => []),
  ]);

  // 구독이 없으면 목록 질의가 어차피 비어 있어 건너뜀
  const page =
    areas.length > 0
      ? await readNotificationPage({ userId: user.id })
      : { items: [], nextCursor: null };

  const withMatchPhotos = await attachPhotoUrls(matchRows);
  const matches: MatchAlertItem[] = withMatchPhotos.map((row) => ({
    id: row.id,
    animalType: row.animalType,
    colors: row.colors,
    size: row.size,
    careSituation: row.careSituation,
    injury: row.injury,
    areaName: row.areaName,
    createdAt: row.createdAt,
    photoUrl: row.photoUrl,
    score: row.score,
    lostId: row.lostId,
    lostName: row.lostName,
    // 알림함을 마지막으로 연 뒤에 올라온 제보에만 점을 붙임
    unread: row.createdAt > row.lostReadAt,
  }));

  return (
    <NotificationList
      areas={areas.map((area) => ({
        areaCode: area.areaCode,
        areaName: area.areaName,
        unread: area.unread,
      }))}
      items={page.items}
      nextCursor={encodeAreaReportCursor(page.nextCursor)}
      matches={matches}
    />
  );
}
