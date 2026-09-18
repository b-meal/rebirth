import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { listSightingLostMatches } from "@rebirth/core/matching";

import { getCurrentUser } from "@/lib/auth/session";
import { CTA } from "@/lib/cta-label";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { SightingMatchList } from "@/components/report/sighting-match-list";

// 발견 제보를 실종 신고들과 견주는 화면. 제보 상세의 우리 아이인지 확인 이 여기로 옴
// 로그인하면 내 신고와 견주고, 아니면 가까운 공개 신고를 둘러봄
// 로그인 벽을 세우지 않음. 이 제품에서 보여 줄 것이 매칭이라 계정부터 물으면 아무것도 못 봄
// 견줄 신고가 없어도 작성 화면으로 튕기지 않음. 확인을 누른 사람에게 폼을 들이미는 일이 됨

// 탭한 말을 그대로 제목에 둠. 무엇과 무엇을 견줬는지는 본문 첫 줄이 말함
export const metadata: Metadata = { title: CTA.match, robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function SightingMatchPage({ params }: PageProps<"/r/[id]/match">) {
  const { id } = await params;

  const user = await getCurrentUser();

  // 없는 제보와 실종 신고는 둘 다 여기서 걸림. 실종끼리는 서로 견주지 않음
  const result = await listSightingLostMatches({ sightingId: id, userId: user?.id });
  if (!result) notFound();

  return (
    <Screen>
      <AppHeader title={CTA.match} />
      <SightingMatchList
        reportId={id}
        mode={result.mode}
        total={result.total}
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
