import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSignedThumbUrls } from "@rebirth/core/storage";
import { listReporterReportPage } from "@rebirth/db";
import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { sinceLabel } from "@/lib/report-label";
import { getCurrentUser } from "@/lib/auth/session";
import { MineReportList, type MineReportItem } from "@/components/mine/mine-report-list";

// 마이페이지 카드가 앞 몇 건만 보여 주므로 전체는 이 화면에서 봄
// 계정에 묶인 기록만 나옴. 로그인 전에 남긴 제보는 관리 주소로만 열림

export const metadata: Metadata = {
  title: "내 제보",
  // 개인 기록이라 색인하지 않음
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

export default async function MineReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=%2Fmine%2Freports`);
  }

  const query = await searchParams;
  const raw = Array.isArray(query.kind) ? query.kind[0] : query.kind;
  // 실종 신고만 갈라 보고 나머지는 발견 제보로 둠
  const kind = raw === "lost" ? "lost" : "sighting";

  const rows = await listReporterReportPage(user.id, { kind });

  // 카드에 쓸 사진만 서명해 붙임, 경로는 화면으로 내보내지 않음
  const paths = rows.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
  const signed = await createSignedThumbUrls(paths).catch(
    () => new Map<string, string>(),
  );

  const items: MineReportItem[] = rows.map((row) => ({
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

  return <MineReportList items={items} kind={kind} />;
}
