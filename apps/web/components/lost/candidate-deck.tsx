"use client";

import { useCallback, useEffect, useState } from "react";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { ResultSection } from "seed-design/ui/result-section";
import { Snackbar, SnackbarAvoidOverlap, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { ScreenBody } from "@/components/ui/screen";
import { CandidatePhoto } from "./candidate-photo";

// 확인할 후보를 카드로 훑음, 좌우 스와이프 대신 버튼과 키보드로 동작

/** 한 줄짜리 알림이 머무는 시간. 기본 4초는 읽고 나서도 한참 남아 있음 */
const SNACKBAR_MS = 2000;

export type Candidate = {
  id: string;
  score: number;
  breakdown: {
    distance: number;
    time: number;
    color: number;
    size: number;
    features: number;
    reason: string;
  };
  appearance: string | null;
  colors: string[];
  size: "small" | "medium" | "large" | "unknown";
  careSituation: "roaming" | "in_care" | "unknown";
  conditionTags: string[];
  areaName: string | null;
  occurredAt: string;
};

const CARE_LABEL: Record<Candidate["careSituation"], string> = {
  roaming: "배회 중",
  in_care: "제보자 보호 중",
  unknown: "확인 중",
};

function formatAbsolute(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type CandidateDeckProps = {
  candidates: Candidate[];
  /** 내 신고를 한마디로 줄인 말. 무엇과 견준 점수인지 밝히는 데 씀 */
  lostLabel: string;
};

export function CandidateDeck({ candidates, lostLabel }: CandidateDeckProps) {
  const [index, setIndex] = useState(0);
  // 아니에요 는 영구 제외가 아니라 목록 뒤로만 밀어 다시 볼 수 있게 함
  const [pushedBack, setPushedBack] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const snackbar = useSnackbarAdapter();

  // 뒤로 밀린 후보를 끝으로 옮긴 순서
  const ordered = [
    ...candidates.filter((c) => !pushedBack.includes(c.id)),
    ...candidates.filter((c) => pushedBack.includes(c.id)),
  ];
  const current = ordered[index];

  // 마지막 장에서 더 넘기지 않음
  // 아니에요 는 목록 뒤로만 미는 것이라 볼 후보가 남아 있는데도 빈 화면이 되면 막다른 길임
  const next = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, Math.max(ordered.length - 1, 0)));
  }, [ordered.length]);

  const previous = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const pushBack = useCallback(() => {
    if (!current) return;
    setPushedBack((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
  }, [current]);

  // 표시하면 아래 버튼이 상세로 바뀌어 화면이 달라지지만 그 까닭까지 말해 주지는 않음
  const pick = useCallback(() => {
    if (!current) return;
    setPicked(current.id);
    snackbar.create({
      timeout: SNACKBAR_MS,
      render: () => (
        <Snackbar variant="positive" message="표시해 두었어요" onClick={snackbar.dismiss} />
      ),
    });
  }, [current, snackbar]);

  // 제스처를 못 쓰는 사용자가 기능 전체를 못 쓰는 상태를 만들지 않음
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        previous();
      } else if (event.key === "Enter" && current) {
        event.preventDefault();
        pick();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, current, pick]);

  if (candidates.length === 0) {
    return (
      <ResultSection
        size="medium"
        title="아직 후보가 없어요"
        description="가까운 곳에 목격 제보가 올라오면 여기에 나와요"
      />
    );
  }

  // 넘기는 쪽이 마지막 장에서 멈추므로 여기까지 오지 않음
  // 목록이 줄어 자리가 비는 드문 경우를 위한 안전망. 첫 장으로 되돌림
  if (!current) {
    return (
      <ResultSection
        size="medium"
        title="후보를 다시 불러올게요"
        primaryActionProps={{ children: "처음부터 보기", onClick: () => setIndex(0) }}
      />
    );
  }

  // 털색은 아래 특징 문장이 대개 먼저 말해 빼고, 상태는 문장에 없는 값이라 남김
  const conditions = current.conditionTags.filter(Boolean);
  const last = index === ordered.length - 1;

  return (
    <>
      {/* 앱바 바로 아래에 장수 한 줄만 있어 기본 여백은 넓게 뜸 */}
      <ScreenBody gap="x4" pt="x2">
        {/* 장수 줄은 사진에 딸린 머리글이라 한 묶음으로 붙여 둠
            바깥 간격을 그대로 두면 다음 덩어리만큼 떨어져 어디에 붙는 줄인지 흐려짐 */}
        <VStack align="stretch" gap="x2">
          {/* 몇 번째인지와 앞 장으로 되돌아가는 일은 같은 묶음
              아래 판정 버튼 옆에 두면 맞다 아니다 와 나란한 선택지로 읽힘
              되돌아가기는 곁다리라 면을 칠하지 않음. 칠하면 판정 버튼과 세기를 다툼
              첫 장에서는 같은 버튼을 감춰 자리만 지킴
              빼 버리면 둘째 장에서 줄이 늘어나며 사진이 밀리고, 회색으로 두면 왜 못 누르는지 묻게 됨 */}
          <HStack justify="space-between" align="center">
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {index + 1} / {ordered.length}
            </Text>
            <ActionButton
              variant="ghost"
              size="xsmall"
              onClick={previous}
              // 감춘 동안에는 누를 수도 읽힐 수도 없어야 함
              tabIndex={index === 0 ? -1 : undefined}
              aria-hidden={index === 0}
              style={index === 0 ? { visibility: "hidden" } : undefined}
            >
              이전 후보
            </ActionButton>
          </HStack>

          <CandidatePhoto
            reportId={current.id}
            // 다음 두 장을 미리 받아 넘길 때 지연이 없게 함
            prefetchIds={ordered.slice(index + 1, index + 3).map((c) => c.id)}
          />
        </VStack>

        {/* 어디서 언제 봤는지가 가장 먼저 판단에 쓰임. 사진 다음 자리를 줌
            점수는 그 뒤에 옴. 숫자부터 크게 두면 그 값으로 결론이 난 것처럼 읽힘 */}
        <VStack align="stretch" gap="x1">
          <Text textStyle="t6Bold" color="fg.neutral">
            {current.areaName ?? "위치 미확인"}
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            {[formatAbsolute(current.occurredAt), CARE_LABEL[current.careSituation], ...conditions].join(
              " · ",
            )}
          </Text>
        </VStack>

        {/* 적힌 것이 없으면 없다고 알리지 않고 줄을 그리지 않음
            털색은 이 문장이 대개 먼저 말해 따로 태그로 달지 않음 */}
        {current.appearance ? (
          <Text textStyle="articleBody" color="fg.neutral">
            {current.appearance}
          </Text>
        ) : null}

        {/* 왜 후보로 올랐는지는 상자 안에 묶음
            본문과 같은 결로 두면 제보자가 적은 말과 저울이 매긴 값이 섞여 읽힘 */}
        <VStack align="stretch" gap="x1_5" px="x4" py="x3" borderRadius="r3" bg="bg.neutralWeak">
          <HStack justify="space-between" align="center" gap="x2">
            <Text textStyle="t4Bold" color="fg.neutral">
              {lostLabel} 신고와 {current.score}점
            </Text>
            <Text textStyle="t2Regular" color="fg.neutralSubtle">
              확정 아님
            </Text>
          </HStack>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {current.breakdown.reason}
          </Text>
        </VStack>
      </ScreenBody>

      {/* 이 화면에서 할 일은 판정 하나뿐이라 늘 같은 자리에 둠
          특징이 길면 함께 흘러가 버려 스크롤해야 누를 수 있었음
          아니에요 도 목록 뒤로만 밀어 다시 볼 수 있어 되돌릴 수 없는 선택이 아님 */}
      <SnackbarAvoidOverlap>
        <VStack
          align="stretch"
          gap="x2"
          position="sticky"
          bottom="0"
          px="spacingX.globalGutter"
          pt="x3"
          bg="bg.layerDefault"
          className="rebirth-bottom-bar"
        >
          {/* 마지막 장에서는 넘길 곳이 없어 왜 못 누르는지 한 줄로 밝힘
              이 말이 없으면 회색이 된 버튼을 보고 고장인 줄 앎 */}
          {last && picked !== current.id ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted" align="center">
              마지막 후보예요
            </Text>
          ) : null}

          {picked === current.id ? (
            <ActionButton variant="brandSolid" size="large" asChild>
              <a href={`/r/${current.id}`}>제보 상세 보기</a>
            </ActionButton>
          ) : (
            <HStack gap="x2">
              <ActionButton
                variant="brandSolid"
                size="large"
                flexGrow={1}
                onClick={pick}
              >
                맞는 것 같아요
              </ActionButton>
              <ActionButton
                variant="neutralOutline"
                size="large"
                flexGrow={1}
                // 넘길 다음 장이 없음. 눌러도 같은 자리에 머물러 눌리는 것처럼 두지 않음
                disabled={last}
                onClick={() => {
                  pushBack();
                  next();
                }}
              >
                아니에요
              </ActionButton>
            </HStack>
          )}
        </VStack>
      </SnackbarAvoidOverlap>
    </>
  );
}
