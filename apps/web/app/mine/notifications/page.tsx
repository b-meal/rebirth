import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { attachPhotoUrls } from "@rebirth/core/reports";
import { listAreaSubscriptions, listSubscribedAreaReports } from "@rebirth/db";
import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { getCurrentUser } from "@/lib/auth/session";
import {
  NotificationList,
  type NotificationItem,
} from "@/components/mine/notification-list";

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

  const areas = await listAreaSubscriptions(user.id).catch(() => []);

  // 구독이 없으면 목록 질의가 어차피 비어 있어 건너뜀
  const rows = areas.length > 0 ? await listSubscribedAreaReports(user.id) : [];
  const withPhotos = await attachPhotoUrls(rows);

  const items: NotificationItem[] = withPhotos.map((row) => ({
    id: row.id,
    animalType: row.animalType,
    colors: row.colors,
    size: row.size,
    careSituation: row.careSituation,
    injury: row.injury,
    areaName: row.areaName,
    createdAt: row.createdAt,
    photoUrl: row.photoUrl,
    unread: row.readAt ? row.createdAt > row.readAt : true,
  }));

  return (
    <NotificationList
      areas={areas.map((area) => ({
        areaCode: area.areaCode,
        areaName: area.areaName,
        unread: area.unread,
      }))}
      items={items}
    />
  );
}
