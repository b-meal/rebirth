"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AspectRatio, Divider, Skeleton, Text, VStack } from "@seed-design/react";
import { ResultSection } from "seed-design/ui/result-section";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { CandidateDeck, type Candidate } from "./candidate-deck";

// 내 신고 요약과 확인할 후보, 토큰은 클라이언트에서만 읽어 서버 로그에 남지 않음

type LostSummary = {
  id: string;
  animalType: "dog" | "cat" | "other" | "unknown";
  appearance: string | null;
  colors: string[];
  size: "small" | "medium" | "large" | "unknown";
  areaName: string | null;
  occurredAt: string;
  status: string;
};

const ANIMAL_LABEL: Record<LostSummary["animalType"], string> = {
  dog: "개",
  cat: "고양이",
  other: "그 외",
  unknown: "확인 어려움",
};

const SIZE_LABEL: Record<LostSummary["size"], string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "크기 미확인",
};

type State =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "error" }
  | { status: "ready"; lost: LostSummary; candidates: Candidate[] };

export function LostView() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (): Promise<State> => {
    if (!token) return { status: "invalid" };
    try {
      // 주소에 담긴 것은 관리 토큰이라 그대로 조회할 수 없음
      // 먼저 교환해 신고 id 와 관리 세션 쿠키를 받고 그 id 로 후보를 읽음
      const exchanged = await fetch("/api/manage/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (exchanged.status === 404) return { status: "invalid" };
      if (!exchanged.ok) return { status: "error" };
      const { id } = (await exchanged.json()) as { id: string };

      const response = await fetch(`/api/lost/${id}/candidates`);
      if (response.status === 404) return { status: "invalid" };
      if (!response.ok) return { status: "error" };
      const body = (await response.json()) as {
        lost: LostSummary;
        candidates: Candidate[];
      };
      return { status: "ready", lost: body.lost, candidates: body.candidates };
    } catch {
      return { status: "error" };
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void load().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (state.status === "loading") {
    return (
      <Screen>
        <AppHeader title="확인할 후보" home />
        {/* 들어설 화면과 같은 자리에 같은 크기로 둠
            다른 모양으로 두면 값이 오는 순간 화면이 다시 짜여 덜컥임 */}
        <VStack align="stretch">
          <ScreenBody pb="x3" gap="x1">
            <Skeleton width="55%" height="x7" radius="8" />
            <Skeleton width="90%" height="x4" radius="8" />
          </ScreenBody>

          <Divider />

          <ScreenBody gap="x4">
            <Skeleton width="20%" height="x4" radius="8" />
            <AspectRatio ratio={4 / 3}>
              <Skeleton width="full" height="full" radius="16" />
            </AspectRatio>
            <VStack align="stretch" gap="x1">
              <Skeleton width="35%" height="x6" radius="8" />
              <Skeleton width="80%" height="x4" radius="8" />
            </VStack>
          </ScreenBody>
        </VStack>
      </Screen>
    );
  }

  if (state.status === "invalid") {
    return (
      <Screen>
        <AppHeader title="확인할 후보" home />
        <ScreenBody>
          <ResultSection
            size="medium"
            title="주소가 맞지 않아요"
            description="저장해 둔 조회 주소를 다시 확인해 주세요"
          />
        </ScreenBody>
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen>
        <AppHeader title="확인할 후보" home />
        <ScreenBody>
          <ResultSection
            size="medium"
            title="후보를 불러오지 못했어요"
            primaryActionProps={{
              children: "다시 시도하기",
              onClick: () => {
                setState({ status: "loading" });
                void load().then(setState);
              },
            }}
          />
        </ScreenBody>
      </Screen>
    );
  }

  const { lost, candidates } = state;

  return (
    <Screen>
      <AppHeader title="확인할 후보" home />
      <VStack align="stretch">
        {/* 내 신고 내용은 본인이 방금 적은 것이라 다시 펼쳐 보여 줄 이유가 없음
            지금 할 일은 아래 후보를 보는 것이고 머리글은 그것만 말함
            개체 확정이 아니라는 말은 카드마다 되풀이하지 않고 여기서 한 번만 밝힘 */}
        <ScreenBody pb="x3" gap="x1">
          <Text as="h1" textStyle="t7Bold" color="fg.neutral">
            확인할 후보 {candidates.length}건
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {[ANIMAL_LABEL[lost.animalType], SIZE_LABEL[lost.size]].join(" · ")} 신고와 닮은
            순서예요. 유사도이며 동일 개체 확정이 아니에요
          </Text>
        </ScreenBody>

        <Divider />

        <CandidateDeck candidates={candidates} />
      </VStack>
    </Screen>
  );
}
