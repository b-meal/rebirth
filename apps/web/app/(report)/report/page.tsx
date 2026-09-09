import { ReportForm } from "../../../components/report/report-form";

export const metadata = {
  title: "제보하기",
  // 폼은 검색 대상이 아님
  robots: { index: false },
};

export default function ReportPage() {
  return <ReportForm />;
}
