import { findPublicReport } from "@rebirth/db";
import { notFound } from "next/navigation";

import { ReportDone } from "@/components/report/report-done";

// 저장 직후에만 들르는 화면. 검색에 노출할 이유가 없음
export const metadata = {
  title: "제보 완료",
  robots: { index: false },
};

// 방금 저장한 제보를 바로 읽어야 해 캐시하지 않음
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Params = { params: Promise<{ id: string }> };

export default async function ReportDonePage({ params }: Params) {
  const { id } = await params;

  const report = await findPublicReport(id);
  if (!report) notFound();

  return <ReportDone id={id} areaName={report.areaName} shareUrl={`${SITE}/r/${id}`} />;
}
