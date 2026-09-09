import { findPublicReport } from "@rebirth/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportDetail } from "@/components/report/report-detail";

// 공유 링크를 받은 제3자가 처음 보는 화면
// 정확 좌표와 제보자 정보, 품종 확정 표현을 렌더하지 않음

type Params = { params: Promise<{ id: string }> };

// 숨김 처리와 새 제보가 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  // layout 의 title.template 이 "· 다시집" 을 붙이므로 여기서 넣지 않음
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

export default async function ReportDetailPage({ params }: Params) {
  const { id } = await params;

  const report = await findPublicReport(id);
  if (!report) notFound();

  return <ReportDetail report={report} shareUrl={`${SITE}/r/${id}`} />;
}
