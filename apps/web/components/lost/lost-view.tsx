"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Divider,
  FlexBox,
  SectionMessage,
  Skeleton,
  Typography,
} from "@wanteddev/wds";

import { CandidateDeck, type Candidate } from "./candidate-deck";

// 내 신고 요약과 확인할 후보
// 토큰은 클라이언트에서만 읽어 서버 렌더 로그에 남지 않게 함

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
      const response = await fetch(`/api/lost/${token}`);
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
      <FlexBox flexDirection="column" gap="12px" sx={{ padding: "20px 16px" }}>
        <Skeleton width="60%" height="24px" />
        <Skeleton width="100%" height="80px" />
        <Skeleton width="100%" height="280px" />
      </FlexBox>
    );
  }

  if (state.status === "invalid") {
    return (
      <FlexBox flexDirection="column" gap="12px" sx={{ padding: "24px 16px" }}>
        <Typography variant="headline1" weight="bold">
          조회 주소가 맞지 않습니다
        </Typography>
        <Typography variant="body2">
          받은 링크를 다시 확인해 주십시오. 연락처를 받지 않으므로 주소를 잃으면
          신고를 다시 찾을 수 없습니다
        </Typography>
      </FlexBox>
    );
  }

  if (state.status === "error") {
    return (
      <FlexBox flexDirection="column" gap="12px" sx={{ padding: "24px 16px" }}>
        <SectionMessage variant="negative" open>
          후보를 불러오지 못했습니다. 잠시 후에 다시 시도해 주십시오
        </SectionMessage>
      </FlexBox>
    );
  }

  const { lost, candidates } = state;

  return (
    <FlexBox flexDirection="column">
      <FlexBox flexDirection="column" gap="8px" sx={{ padding: "20px 16px 12px" }}>
        <Typography variant="title3" weight="bold">
          내 신고
        </Typography>
        <Typography variant="body2">
          {[ANIMAL_LABEL[lost.animalType], SIZE_LABEL[lost.size], ...lost.colors]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
        {lost.appearance ? (
          <Typography variant="caption1">{lost.appearance}</Typography>
        ) : null}
        <Typography variant="caption1">
          {lost.areaName ?? "위치 미확인"} 에서 마지막 목격
        </Typography>
        <Typography variant="headline2" weight="bold" sx={{ marginTop: "8px" }}>
          확인할 후보 {candidates.length}건
        </Typography>
      </FlexBox>

      <Divider />

      <CandidateDeck candidates={candidates} />
    </FlexBox>
  );
}
