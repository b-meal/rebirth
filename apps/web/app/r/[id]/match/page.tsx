import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { listSightingLostMatches } from "@rebirth/core/matching";

import { getCurrentUser } from "@/lib/auth/session";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { SightingMatchList } from "@/components/report/sighting-match-list";

// 발견 제보를 실종 신고들과 견주는 화면. 제보 상세의 내 가족 같아요 가 여기로 옴
// 로그인하면 내 신고와 견주고, 아니면 가까운 공개 신고를 둘러봄
// 로그인 벽을 세우지 않음. 이 제품에서 보여 줄 것이 매칭이라 계정부터 물으면 아무것도 못 봄

export const metadata: Metadata = { title: "닮은 실종 신고", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function SightingMatchPage({ params }: PageProps<"/r/[id]/match">) {
  const { id } = await params;

  const user = await getCurrentUser();

  // 없는 제보와 실종 신고는 둘 다 여기서 걸림. 실종끼리는 서로 견주지 않음
  const result = await listSightingLostMatches({ sightingId: id, userId: user?.id });
  if (!result) notFound();

  // 로그인은 했는데 찾는 중인 신고가 없으면 견줄 기준부터 만들어야 함
  if (result.mode === "mine" && result.total === 0) redirect("/lost/new");

  return (
    <Screen>
      <AppHeader title={result.mode === "mine" ? "내 신고와 견주기" : "닮은 실종 신고"} />
      <SightingMatchList
        reportId={id}
        mode={result.mode}
        items={result.matches.map((match) => ({
          lostId: match.lostId,
          petName: match.petName,
          animalType: match.animalType,
          size: match.size,
          areaName: match.areaName,
          occurredAt: match.occurredAt.toISOString(),
          score: match.score,
          reason: match.breakdown.reason,
        }))}
      />
    </Screen>
  );
}
