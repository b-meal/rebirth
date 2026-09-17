import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";
import { listSightingLostMatches } from "@rebirth/core/matching";

import { getCurrentUser } from "@/lib/auth/session";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { SightingMatchList } from "@/components/report/sighting-match-list";

// 발견 제보를 내 실종 신고들과 견주는 화면. 제보 상세의 내 가족 같아요 가 여기로 옴
// 견줄 기준은 내 실종 신고라 하나도 없으면 신고 작성으로 보냄
// 남의 신고는 읽지 않음. 계정에 묶인 신고만 견주므로 관리 주소 없이도 열림

export const metadata: Metadata = { title: "내 신고와 견주기", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function SightingMatchPage({ params }: PageProps<"/r/[id]/match">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(`/r/${id}/match`)}`);
  }

  // 없는 제보와 실종 신고는 둘 다 여기서 걸림. 실종끼리는 서로 견주지 않음
  const result = await listSightingLostMatches({ sightingId: id, userId: user.id });
  if (!result) notFound();

  // 찾는 중인 신고가 없으면 견줄 기준부터 만들어야 함
  if (result.total === 0) redirect("/lost/new");

  return (
    <Screen>
      <AppHeader title="내 신고와 견주기" />
      <SightingMatchList
        reportId={id}
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
