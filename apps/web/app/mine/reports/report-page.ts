import "server-only";

import { createSignedThumbUrls } from "@rebirth/core/storage";
import { listReporterReportPage } from "@rebirth/db";

import { sinceLabel } from "@/lib/report-label";
import type { MineReportItem } from "@/components/mine/mine-report-list";

// 내 기록 한 쪽을 읽는 규칙
// 서버 컴포넌트의 첫 쪽과 이어 읽는 API 가 같은 함수를 써야 두 길이 어긋나지 않음

/** 한 번에 내려보내는 건수. DB 기본값과 같게 두어 한 쪽이 두 번 잘리지 않게 함 */
const PAGE_SIZE = 20;

export type MineCursor = { occurredAt: Date; id: string };

export type MineReportPage = {
  items: MineReportItem[];
  nextCursor: MineCursor | null;
};

export type MineReportPageOptions = {
  userId: string;
  kind: "sighting" | "lost";
  cursor?: MineCursor;
};

export async function readMineReportPage({
  userId,
  kind,
  cursor,
}: MineReportPageOptions): Promise<MineReportPage> {
  // 한 건 더 받아 다음 쪽이 있는지 봄. 개수를 따로 세면 목록과 어긋날 수 있음
  const rows = await listReporterReportPage(userId, {
    kind,
    cursor,
    limit: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  // 카드에 쓸 사진만 서명해 붙임, 경로는 화면으로 내보내지 않음
  const paths = page.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
  const signed = await createSignedThumbUrls(paths).catch(
    () => new Map<string, string>(),
  );

  const items: MineReportItem[] = page.map((row) => ({
    id: row.id,
    animalType: row.animalType,
    colors: row.colors,
    size: row.size,
    careSituation: row.careSituation,
    injury: row.injury,
    areaName: row.areaName,
    sinceLabel: sinceLabel(row.occurredAt),
    photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
    visibility: row.visibility,
    lifecycle: row.lifecycle,
  }));

  const last = page.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? { occurredAt: last.occurredAt, id: last.id } : null,
  };
}

/** 커서를 화면과 주고받는 문자열로 */
export function encodeMineCursor(cursor: MineCursor | null): string | null {
  return cursor ? `${cursor.occurredAt.toISOString()}_${cursor.id}` : null;
}
