import { DRAFT_COOKIE, hashToken } from "@rebirth/core/http";
import { distanceKm } from "@rebirth/core/location/geo";
import { createSignedThumbUrls } from "@rebirth/core/storage";
import {
  countReportInterests,
  findPublicReport,
  findReportCoarsePoint,
  hasReportInterest,
  listMapReports,
  listReportComments,
} from "@rebirth/db";
import { LIST_PERIOD_DAYS } from "@rebirth/types";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { sinceLabel } from "@/lib/report-label";
import { ReportDetail } from "@/components/report/report-detail";
import type { ReportCardItem } from "@/components/report/report-card";
import type { ReportComment } from "@/components/report/report-comments";

// 공유 링크를 받은 제3자용 화면, 정확 좌표와 제보자 정보와 품종 확정 표현 제외

type Params = { params: Promise<{ id: string }> };

// 숨김 처리와 새 제보, 새 댓글이 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 아래에 붙이는 다른 제보 수와 조회 기간
const NEARBY_COUNT = 4;
const NEARBY_DAYS = LIST_PERIOD_DAYS[1];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  let report: Awaited<ReturnType<typeof findPublicReport>> = undefined;
  try {
    report = await findPublicReport(id);
  } catch {
    // 조회 실패 시 기본 메타로 떨어뜨림
  }

  if (!report) {
    return { title: "찾는 제보가 없습니다", robots: { index: false } };
  }

  const where = report.areaName ?? "위치 미확인";
  // layout 의 title.template 이 서비스명을 붙이므로 여기서 넣지 않음
  const title = report.appearance?.split("\n")[0] ?? "발견동물 제보";
  const description = `${where}에서 목격된 발견동물 제보입니다. 보신 적이 있다면 알려 주십시오`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE}/r/${id}`,
      images: [{ url: `${SITE}/r/${id}/card`, width: 1080, height: 1350 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

type NearbyOrigin = { lat: number; lng: number } | null;

/**
 * 아래에 붙일 다른 제보. 좌표가 있으면 가까운 순, 없으면 최근 순
 * 격자 좌표는 서버에서만 읽고 카드에는 지역명만 내보냄. POL-09
 */
async function loadNearby(currentId: string, origin: NearbyOrigin): Promise<ReportCardItem[]> {
  try {
    const since = new Date(Date.now() - NEARBY_DAYS * 86_400_000);
    const rows = (await listMapReports({ fromOccurredAt: since })).filter(
      (row) => row.id !== currentId && row.coarsePoint !== null,
    );

    const ordered = origin
      ? [...rows].sort(
          (a, b) =>
            distanceKm(origin, { lat: a.coarsePoint!.y, lng: a.coarsePoint!.x }) -
            distanceKm(origin, { lat: b.coarsePoint!.y, lng: b.coarsePoint!.x }),
        )
      : rows;
    const picked = ordered.slice(0, NEARBY_COUNT);

    // 비공개 버킷이라 서명이 필요하고 카드와 핀이 같은 축소본을 함께 씀
    const paths = picked.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
    const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

    return picked.map((row) => ({
      id: row.id,
      animalType: row.animalType,
      colors: row.colors,
      size: row.size,
      careSituation: row.careSituation,
      injury: row.injury,
      areaName: row.areaName,
      sinceLabel: sinceLabel(row.occurredAt),
      photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
    }));
  } catch {
    return [];
  }
}

async function loadComments(reportId: string): Promise<ReportComment[]> {
  try {
    const rows = await listReportComments(reportId);
    return rows.map((row) => ({
      id: row.id,
      authorSeq: row.authorSeq,
      body: row.body,
      sinceLabel: sinceLabel(row.createdAt),
    }));
  } catch {
    return [];
  }
}

/** 하트 상태는 쿠키 해시로 바로 조회함, 열람만으로 세션을 새로 만들지 않음 */
async function loadInterest(reportId: string): Promise<{ count: number; mine: boolean }> {
  try {
    const token = (await cookies()).get(DRAFT_COOKIE)?.value;
    const [count, mine] = await Promise.all([
      countReportInterests(reportId),
      token ? hasReportInterest({ reportId, tokenHash: hashToken(token) }) : false,
    ]);
    return { count, mine };
  } catch {
    return { count: 0, mine: false };
  }
}

export default async function ReportDetailPage({ params }: Params) {
  const { id } = await params;

  const report = await findPublicReport(id);
  if (!report) notFound();

  const spot = await findReportCoarsePoint(id).catch(() => undefined);
  const point = spot?.coarsePoint ? { lat: spot.coarsePoint.y, lng: spot.coarsePoint.x } : null;

  const [comments, nearby, interest] = await Promise.all([
    loadComments(id),
    loadNearby(id, point),
    loadInterest(id),
  ]);

  return (
    <ReportDetail
      report={report}
      shareUrl={`${SITE}/r/${id}`}
      sinceLabel={sinceLabel(report.occurredAt)}
      location={point ? { point, gridMeters: spot?.coarseGridM ?? 300 } : null}
      comments={comments}
      nearby={nearby}
      interest={interest}
    />
  );
}
