import { isUuid, ok } from "@rebirth/core/http";
import { createSignedThumbUrls } from "@rebirth/core/storage";
import { listReportCards } from "@rebirth/db";

import { sinceLabel } from "@/lib/report-label";

// 최근 본 목록처럼 브라우저가 id 만 들고 있는 화면에 카드 자료를 돌려줌
// 좌표는 담지 않고 사진은 축소본 서명 URL 로만 나감

// 한 번에 받는 수. 최근 본 목록 길이에 맞춤
const MAX_IDS = 12;

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(isUuid)
    .slice(0, MAX_IDS);
  if (ids.length === 0) return ok({ items: [] });

  const rows = await listReportCards(ids);
  const paths = rows.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
  const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

  // 보낸 순서가 곧 최근 순이라 그대로 맞춰 돌려줌
  const byId = new Map(rows.map((row) => [row.id, row]));
  const items = ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        animalType: row.animalType,
        colors: row.colors,
        size: row.size,
        careSituation: row.careSituation,
        injury: row.injury,
        areaName: row.areaName,
        sinceLabel: sinceLabel(row.occurredAt),
        photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
      },
    ];
  });

  return ok({ items });
}
