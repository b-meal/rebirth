import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { countReporterReportsByKind } from "@rebirth/db";
import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { getCurrentUser } from "@/lib/auth/session";
import { MineReportList } from "@/components/mine/mine-report-list";
import { encodeMineCursor, readMineReportPage } from "./report-page";

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
  const picked = raw === "lost" ? "lost" : raw === "sighting" ? "sighting" : null;

  // 건수는 탭에 함께 붙임. 고른 쪽이 비어도 다른 쪽에 몇 건이 있는지 보여야 함
  const counts = await countReporterReportsByKind(user.id).catch(() => ({
    sighting: 0,
    lost: 0,
  }));

  // 고르지 않고 들어왔는데 발견 제보가 없으면 실종 신고를 폄
  // 기록이 있는데도 빈 화면이 먼저 뜨면 사라진 것으로 읽힘
  const kind =
    picked ?? (counts.sighting === 0 && counts.lost > 0 ? "lost" : "sighting");

  // 첫 쪽만 여기서 그림. 아래로 내려가면 화면이 같은 규칙으로 이어 받음
  const page = await readMineReportPage({ userId: user.id, kind });

  return (
    <MineReportList
      items={page.items}
      kind={kind}
      counts={counts}
      nextCursor={encodeMineCursor(page.nextCursor)}
    />
  );
}
