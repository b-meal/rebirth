import "server-only";

import { attachPhotoUrls } from "@rebirth/core/reports";
import { listSubscribedAreaReports, type AreaReportCursor } from "@rebirth/db";

import type { NotificationItem } from "@/components/mine/notification-list";

// 알림함 새 제보 한 쪽을 읽는 규칙
// 서버 컴포넌트의 첫 쪽과 이어 읽는 API 가 같은 함수를 써야 두 길이 어긋나지 않음

/** 한 번에 내려보내는 건수. 알림함은 한 줄이 낮아 한 화면에 여러 줄이 들어감 */
const PAGE_SIZE = 20;

export type NotificationPage = {
  items: NotificationItem[];
  nextCursor: AreaReportCursor | null;
};

export type NotificationPageOptions = {
  userId: string;
  cursor?: AreaReportCursor;
};

export async function readNotificationPage({
  userId,
  cursor,
}: NotificationPageOptions): Promise<NotificationPage> {
  // 한 건 더 받아 다음 쪽이 있는지 봄. 개수를 따로 세면 목록과 어긋날 수 있음
  const rows = await listSubscribedAreaReports(userId, {
    cursor,
    limit: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const withPhotos = await attachPhotoUrls(page);

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

  const last = page.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

/** 커서를 화면과 주고받는 문자열로 */
export function encodeAreaReportCursor(cursor: AreaReportCursor | null): string | null {
  return cursor ? `${cursor.createdAt.toISOString()}_${cursor.id}` : null;
}
