import type { Metadata } from "next";

import { listAdminReports, listPendingFlags } from "@rebirth/db";
import { FLAG_REASON_LABEL, type FlagReason } from "@rebirth/types";

import { ModerationView, type ModerationItem } from "./view";

export const metadata: Metadata = { title: "검수" };

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const queue = await listPendingFlags().catch(() => []);

  // 신고가 붙은 제보만 다시 읽음. 목록 전체를 훑지 않기 위함
  const reports = await listAdminReports({ flaggedOnly: true, limit: 100 }).catch(
    () => [],
  );
  const byId = new Map(reports.map((report) => [report.id, report]));

  const items: ModerationItem[] = queue.map((row) => {
    const report = byId.get(row.reportId);
    return {
      reportId: row.reportId,
      flagCount: Number(row.flagCount),
      firstReportedAt: row.firstReportedAt.toISOString(),
      reasons: row.reasons.map(
        (reason) => FLAG_REASON_LABEL[reason as FlagReason] ?? reason,
      ),
      appearance: report?.appearance ?? null,
      areaName: report?.areaName ?? null,
      visibility: report?.visibility ?? null,
    };
  });

  return <ModerationView items={items} />;
}
