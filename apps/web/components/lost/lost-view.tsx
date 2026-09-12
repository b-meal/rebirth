"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { VStack } from "@seed-design/react";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { ResultSection } from "seed-design/ui/result-section";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { CandidateDeck, type Candidate } from "./candidate-deck";

// 확인할 후보, 토큰은 클라이언트에서만 읽어 서버 로그에 남지 않음

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
  // 너무 자주 열어 잠긴 상태. 다시 눌러도 소용없어 얼마나 기다릴지 알려야 함
  | { status: "throttled"; retryAfterSeconds: number }
  | { status: "ready"; lost: LostSummary; candidates: Candidate[] };

/** 서버가 알려 준 대기 시간을 사람이 읽는 단위로 바꿈 */
function describeWait(seconds: number): string {
  if (seconds <= 60) return "잠시 후";
  return `${Math.ceil(seconds / 60)}분 뒤`;
}

/**
 * 토큰마다 진행 중인 교환을 하나만 둠
 * 개발에서 effect 가 두 번 도는데 그때마다 부르면 열 때마다 한도를 두 칸씩 먹음
 * 컴포넌트 밖에 두어 다시 그려도 같은 약속을 나눠 씀
 */
const exchanges = new Map<string, Promise<Response>>();

function exchangeOnce(token: string): Promise<Response> {
  const pending = exchanges.get(token);
  if (pending) return pending.then((response) => response.clone());

  const request = fetch("/api/manage/exchange", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  exchanges.set(token, request);
  // 실패한 교환까지 붙들고 있으면 잠금이 풀려도 같은 응답만 돌려줌
  void request.then(
    (response) => {
      if (!response.ok) exchanges.delete(token);
    },
    () => exchanges.delete(token),
  );
  return request.then((response) => response.clone());
}

export function LostView() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (): Promise<State> => {
    if (!token) return { status: "invalid" };
    try {
      // 주소에 담긴 것은 관리 토큰이라 그대로 조회할 수 없음
      // 먼저 교환해 신고 id 와 관리 세션 쿠키를 받고 그 id 로 후보를 읽음
      const exchanged = await exchangeOnce(token);
      // 없는 토큰은 404, 모양부터 틀린 토큰은 400. 둘 다 주소가 잘못된 것
      if (exchanged.status === 404 || exchanged.status === 400) return { status: "invalid" };
      // 짧은 사이에 여러 번 열면 잠김. 못 불러온 것과 달리 기다리면 풀림
      if (exchanged.status === 429) {
        const body = (await exchanged.json().catch(() => null)) as {
          retryAfter?: number;
        } | null;
        return { status: "throttled", retryAfterSeconds: body?.retryAfter ?? 60 };
      }
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
        {/* 몇 건이 올지 몰라 뼈대를 세워도 들어설 모양과 맞지 않음
            돌아가는 표시 하나만 두고 화면 가운데를 비워 둠 */}
        <VStack align="center" justify="center" grow={1} py="x16">
          <ProgressCircle size="40" tone="neutral" />
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

  if (state.status === "throttled") {
    return (
      <Screen>
        <AppHeader title="확인할 후보" home />
        <ScreenBody>
          {/* 다시 시도하기를 두지 않음. 눌러도 같은 벽에 부딪혀 헛손질이 됨 */}
          <ResultSection
            size="medium"
            title={`${describeWait(state.retryAfterSeconds)} 다시 열어 주세요`}
            description="짧은 사이에 여러 번 열어 잠시 막아 두었어요"
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
      {/* 앱바가 이미 이름을 대고 있어 같은 말을 큰 제목으로 또 쓰지 않음
          건수는 이름에 붙이면 한 줄로 끝나고 화면 위가 사진에 돌아감 */}
      <AppHeader title={`확인할 후보 ${candidates.length}건`} home />
      <CandidateDeck
        candidates={candidates}
        lostLabel={[ANIMAL_LABEL[lost.animalType], SIZE_LABEL[lost.size]].join(" · ")}
      />
    </Screen>
  );
}
