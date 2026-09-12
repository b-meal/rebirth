"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  // 너무 자주 열어 잠긴 상태. 다시 눌러도 소용없어 언제 풀리는지 알려야 함
  // 남은 초가 아니라 풀리는 시각을 들어야 다시 그려도 값이 흔들리지 않음
  | { status: "throttled"; retryAt: number }
  | { status: "ready"; lost: LostSummary; candidates: Candidate[] };

/** 남은 시간을 분과 초로 적음. 초만 적으면 180 초가 얼마나 긴지 가늠되지 않음 */
function formatRemaining(seconds: number): string {
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (minutes === 0) return `${rest}초`;
  return `${minutes}분 ${String(rest).padStart(2, "0")}초`;
}

/**
 * 끝나는 시각까지 남은 초, 매 초 다시 셈
 * 멈춰 있는 숫자는 화면이 굳은 것처럼 보이고 언제 다시 눌러야 할지도 알 수 없음
 * 남은 값을 하나씩 빼지 않고 시각을 견주어 탭이 잠든 사이 흐른 시간도 반영함
 * 다 되면 onElapsed 로 알려 화면이 스스로 다시 불러옴
 */
function useCountdown(deadline: number | null, onElapsed: () => void) {
  const [remaining, setRemaining] = useState(0);
  // 매 초 만들어지는 함수라 effect 를 다시 걸지 않도록 ref 로 들고 있음
  const elapsed = useRef(onElapsed);
  useEffect(() => {
    elapsed.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    if (deadline === null) return;
    const left = () => Math.max(Math.ceil((deadline - Date.now()) / 1000), 0);
    // 첫 값은 한 박자 뒤에 넣음. 렌더 중에 시각을 읽으면 그릴 때마다 값이 달라짐
    const timer = setInterval(() => {
      const next = left();
      setRemaining(next);
      if (next === 0) {
        clearInterval(timer);
        elapsed.current();
      }
    }, 1000);
    setRemaining(left());
    return () => clearInterval(timer);
  }, [deadline]);

  return remaining;
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
        return { status: "throttled", retryAt: Date.now() + (body?.retryAfter ?? 60) * 1000 };
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

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void load().then(setState);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void load().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // 잠긴 동안에만 셈. 화면에 머물러 있으면 풀리는 순간 스스로 다시 불러옴
  const remaining = useCountdown(state.status === "throttled" ? state.retryAt : null, reload);

  if (state.status === "loading") {
    return (
      <Screen>
        <AppHeader title="확인할 후보" />
        {/* 몇 건이 올지 몰라 뼈대를 세워도 들어설 모양과 맞지 않음
            돌아가는 표시 하나만 두고 화면 가운데를 비워 둠 */}
        <VStack align="center" justify="center" grow={1} py="x16">
          <ProgressCircle size="24" tone="neutral" />
        </VStack>
      </Screen>
    );
  }

  if (state.status === "invalid") {
    return (
      <Screen>
        <AppHeader title="확인할 후보" />
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
        <AppHeader title="확인할 후보" />
        <ScreenBody>
          {/* 다시 시도하기를 두지 않음. 눌러도 같은 벽에 부딪혀 헛손질이 됨
              대신 남은 시간을 세어 보여 주고 다 되면 스스로 불러옴 */}
          <ResultSection
            size="medium"
            title={`${formatRemaining(remaining)} 뒤에 다시 열려요`}
            description="짧은 사이에 여러 번 열어 잠시 막아 두었어요."
          />
        </ScreenBody>
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen>
        <AppHeader title="확인할 후보" />
        <ScreenBody>
          <ResultSection
            size="medium"
            title="후보를 불러오지 못했어요"
            primaryActionProps={{ children: "다시 시도하기", onClick: reload }}
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
      <AppHeader title={`확인할 후보 ${candidates.length}건`} />
      <CandidateDeck
        candidates={candidates}
        lostLabel={[ANIMAL_LABEL[lost.animalType], SIZE_LABEL[lost.size]].join(" · ")}
      />
    </Screen>
  );
}
