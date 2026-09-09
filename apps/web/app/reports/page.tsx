import { listPublicReports } from "@rebirth/db";
import { LIST_DEFAULT_DAYS, LIST_PAGE_SIZE, LIST_PERIOD_DAYS, animalType } from "@rebirth/types";

import { ReportList, type ListItem } from "@/components/report/report-list";

// WEB-08. 첫 장은 서버에서 그리고 다음 장은 목록 API 로 이어 받음
// 숨김과 종료는 질의에서 빠지고 좌표는 응답에 담기지 않음

export const metadata = { title: "최근 발견 제보" };

// 새 제보와 숨김이 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function readOne(value: Search[string]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const query = await searchParams;

  const parsedType = animalType.safeParse(readOne(query.animalType));
  const rawDays = Number(readOne(query.days));
  const days = (LIST_PERIOD_DAYS as readonly number[]).includes(rawDays)
    ? rawDays
    : LIST_DEFAULT_DAYS;

  // 요청 시각 기준으로 조회 기간을 잡음. force-dynamic 이라 매 요청 새로 계산됨
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - days * 86_400_000);

  // 한 건 더 읽어 다음 장이 있는지 판단함
  const rows = await listPublicReports({
    ...(parsedType.success && { animalType: parsedType.data }),
    fromOccurredAt: since,
    limit: LIST_PAGE_SIZE + 1,
  });

  const items = rows.slice(0, LIST_PAGE_SIZE) as ListItem[];
  const last = items.at(-1);
  const hasMore = rows.length > LIST_PAGE_SIZE && Boolean(last);

  return (
    <ReportList
      items={items}
      // 목록 API 의 커서 형식과 같아야 다음 장을 이어 받을 수 있음
      nextCursor={hasMore && last ? `${last.occurredAt.toISOString()}_${last.id}` : null}
    />
  );
}
