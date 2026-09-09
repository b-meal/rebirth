import { notFound } from "next/navigation";
import { ReportDetail } from "../../../components/report/report-detail";
import { findPublicReportMock } from "../../../lib/report-mock";

export default async function PublicReportPage({
  params,
}: PageProps<"/r/[id]">) {
  const { id } = await params;
  // 숨김·삭제·없는 ID 를 구분하지 않고 같은 화면으로 보냄
  const report = findPublicReportMock(id);
  if (!report) notFound();

  return <ReportDetail report={report} />;
}
