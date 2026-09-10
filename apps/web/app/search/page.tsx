import { createSignedThumbUrls } from "@rebirth/core/storage";
import { findFirstPhotoPaths, listPublicReports, listTrendingReports } from "@rebirth/db";
import { LIST_PERIOD_DAYS, listQuery } from "@rebirth/types";

import { sinceLabel } from "@/lib/report-label";
import { SearchScreen } from "@/components/search/search-screen";
import type { ReportCardItem } from "@/components/report/report-card";
import type { TrendingItem } from "@/components/search/trending-chart";

// 검색 화면, 글자와 사진 두 갈래로 제보를 찾고 좌표는 다루지 않음

export const dynamic = "force-dynamic";

// 차트에 셀 기간과 줄 수
const TREND_DAYS = LIST_PERIOD_DAYS[0];
const TREND_LIMIT = 8;

const RESULT_LIMIT = 30;

type SearchParams = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 비공개 버킷이라 카드 사진은 경로를 모아 한 번에 서명함 */
async function signThumbs(paths: (string | null)[]) {
  const wanted = paths.filter((path): path is string => path !== null);
  return createSignedThumbUrls(wanted).catch(() => new Map<string, string>());
}

async function loadResults(
  params: Record<string, string | string[] | undefined>,
): Promise<ReportCardItem[] | null> {
  const parsed = listQuery.safeParse({
    ...(first(params.q) && { q: first(params.q) }),
    ...(first(params.animalType) && { animalType: first(params.animalType) }),
    ...(first(params.size) && { size: first(params.size) }),
    ...(first(params.colors) && { colors: first(params.colors) }),
    ...(first(params.days) && { days: first(params.days) }),
  });
  if (!parsed.success) return null;

  const { q, animalType, size, colors } = parsed.data;
  // 조건이 하나도 없으면 결과 대신 차트와 최근 검색을 보여 줌
  if (!q && !animalType && !size && !colors?.length) return null;

  try {
    const rows = await listPublicReports({
      kind: "sighting",
      q,
      animalType,
      size,
      colors,
      fromOccurredAt: new Date(Date.now() - parsed.data.days * 86_400_000),
      limit: RESULT_LIMIT,
    });

    const photoPaths = await findFirstPhotoPaths(rows.map((row) => row.id));
    const signed = await signThumbs([...photoPaths.values()]);

    return rows.map((row) => {
      const path = photoPaths.get(row.id) ?? null;
      return {
        id: row.id,
        animalType: row.animalType,
        colors: row.colors,
        size: row.size,
        careSituation: row.careSituation,
        injury: row.injury,
        areaName: row.areaName,
        sinceLabel: sinceLabel(row.occurredAt),
        photoUrl: path ? (signed.get(path) ?? null) : null,
      };
    });
  } catch {
    return [];
  }
}

async function loadTrending(sort: "interest" | "help"): Promise<TrendingItem[]> {
  try {
    const rows = await listTrendingReports({ sort, days: TREND_DAYS, limit: TREND_LIMIT });
    const signed = await signThumbs(rows.map((row) => row.photoPath));

    return rows.map((row) => ({
      id: row.id,
      animalType: row.animalType,
      colors: row.colors,
      size: row.size,
      areaName: row.areaName,
      injury: row.injury,
      careSituation: row.careSituation,
      sinceLabel: sinceLabel(row.occurredAt),
      interestCount: row.interestCount,
      commentCount: row.commentCount,
      photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
    }));
  } catch {
    return [];
  }
}

export default async function SearchPage({ searchParams }: SearchParams) {
  const params = await searchParams;

  const [results, interest, help] = await Promise.all([
    loadResults(params),
    loadTrending("interest"),
    loadTrending("help"),
  ]);

  return (
    <SearchScreen query={first(params.q) ?? ""} results={results} trending={{ interest, help }} />
  );
}
