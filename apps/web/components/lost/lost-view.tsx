"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Divider, Skeleton, Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

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
        <ScreenBody gap="x3">
          <Skeleton width="60%" height="x6" radius="8" />
          <Skeleton width="full" height="x16" radius="8" />
          <Skeleton width="full" height="280px" radius="16" />
        </ScreenBody>
      </Screen>
    );
  }

  if (state.status === "invalid") {
    return (
      <Screen>
      <AppHeader title="확인할 후보" home />
        <ScreenBody gap="x3">
          <Text as="h1" textStyle="t7Bold" color="fg.neutral">
            조회 주소가 맞지 않습니다
          </Text>
          <Text textStyle="t5Regular" color="fg.neutralMuted">
            받은 링크를 다시 확인해 주십시오. 연락처를 받지 않으므로 주소를 잃으면 신고를
            다시 찾을 수 없습니다
          </Text>
        </ScreenBody>
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen>
      <AppHeader title="확인할 후보" home />
        <ScreenBody>
          <Callout
            tone="critical"
            description="후보를 불러오지 못했습니다. 잠시 후에 다시 시도해 주십시오"
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
