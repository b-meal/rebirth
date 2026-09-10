"use client";

import { useCallback, useEffect, useState } from "react";
import { Divider, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { ResultSection } from "seed-design/ui/result-section";
import { TagGroupItem, TagGroupRoot } from "seed-design/ui/tag-group";

import { ScreenBody } from "@/components/ui/screen";
import { CandidatePhoto } from "./candidate-photo";

// 확인할 후보를 카드로 훑음, 좌우 스와이프 대신 버튼과 키보드로 동작

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

const WEIGHTS = { distance: 35, time: 25, color: 20, size: 10, features: 10 } as const;

const BREAKDOWN_LABEL = {
  distance: "거리",
  time: "시간",
  color: "털색",
  size: "크기",
  features: "특징",
} as const;

const CARE_LABEL: Record<Candidate["careSituation"], string> = {
  roaming: "배회 중",
  in_care: "제보자 보호 중",
  unknown: "확인 중",
};

// 유사도임을 점수 옆에 항상 붙임, 숫자만 보이면 확정으로 읽힘
const SIMILARITY_NOTE = "유사도이며 동일 개체 확정이 아닙니다";

function formatAbsolute(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type CandidateDeckProps = {
  candidates: Candidate[];
};

export function CandidateDeck({ candidates }: CandidateDeckProps) {
  const [index, setIndex] = useState(0);
  // 아니에요 는 영구 제외가 아니라 목록 뒤로만 밀어 다시 볼 수 있게 함
  const [pushedBack, setPushedBack] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  // 뒤로 밀린 후보를 끝으로 옮긴 순서
  const ordered = [
    ...candidates.filter((c) => !pushedBack.includes(c.id)),
    ...candidates.filter((c) => pushedBack.includes(c.id)),
  ];
  const current = ordered[index];

  const next = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, ordered.length));
  }, [ordered.length]);

  const previous = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const pushBack = useCallback(() => {
    if (!current) return;
    setPushedBack((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
  }, [current]);

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
        setPicked(current.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, current]);

  if (candidates.length === 0) {
    return (
      <ResultSection
        size="medium"
        title="아직 후보가 없습니다"
        description="같은 지역에 목격 제보가 올라오면 이 화면에 후보로 나옵니다. 조회 주소를 저장해 두고 다시 확인해 주십시오"
      />
    );
  }

  if (!current) {
    return (
      <ResultSection
        size="medium"
        title="후보를 모두 봤습니다"
        description={`${SIMILARITY_NOTE}. 다시 보고 싶으면 처음부터 훑을 수 있습니다`}
        primaryActionProps={{
          children: "처음부터 다시 보기",
          onClick: () => setIndex(0),
        }}
      />
    );
  }

  const features = [...current.colors, ...current.conditionTags].filter(Boolean);

  return (
    <ScreenBody gap="x4">
      <HStack justify="space-between" align="center">
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {index + 1} / {ordered.length}
        </Text>
        <TagGroupRoot>
          <TagGroupItem label={CARE_LABEL[current.careSituation]} size="t2" tone="neutral" />
        </TagGroupRoot>
      </HStack>

      <CandidatePhoto
        reportId={current.id}
        // 다음 두 장을 미리 받아 넘길 때 지연이 없게 함
        prefetchIds={ordered.slice(index + 1, index + 3).map((c) => c.id)}
      />

      <VStack align="stretch" gap="x1">
        <HStack gap="x2" align="center" wrap>
          <Text textStyle="t8Bold" color="fg.neutral">
            {current.score}점
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {SIMILARITY_NOTE}
          </Text>
        </HStack>
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          {current.breakdown.reason}
        </Text>
      </VStack>

      {/* 배점 구성을 5개 모두 노출 */}
      <TagGroupRoot>
        {(Object.keys(BREAKDOWN_LABEL) as (keyof typeof BREAKDOWN_LABEL)[]).map((key) => (
          <TagGroupItem
            key={key}
            size="t2"
            tone="neutralSubtle"
            label={`${BREAKDOWN_LABEL[key]} ${WEIGHTS[key]} 중 ${current.breakdown[key]}`}
          />
        ))}
      </TagGroupRoot>

      <Divider />

      <VStack align="stretch" gap="x2">
        <Text textStyle="articleBody" color="fg.neutral">
          {current.appearance ?? "외형 설명이 없습니다"}
        </Text>
        <TagGroupRoot>
          {features.map((feature) => (
            <TagGroupItem key={feature} label={feature} tone="neutralSubtle" />
          ))}
        </TagGroupRoot>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {current.areaName ?? "위치 미확인"} · {formatAbsolute(current.occurredAt)}
        </Text>
      </VStack>

      {picked === current.id ? (
        <Callout
          tone="positive"
          description="이 후보를 표시했습니다. 제보 상세에서 더 자세히 볼 수 있습니다"
        />
      ) : null}

      {/* 제스처와 같은 일을 하는 버튼을 항상 렌더함 */}
      <VStack align="stretch" gap="x2">
        <HStack gap="x2">
          <ActionButton
            variant="brandSolid"
            size="large"
            flexGrow={1}
            onClick={() => setPicked(current.id)}
          >
            맞는 것 같아요
          </ActionButton>
          <ActionButton
            variant="neutralOutline"
            size="large"
            flexGrow={1}
            onClick={() => {
              pushBack();
              next();
            }}
          >
            아니에요
          </ActionButton>
        </HStack>
        <HStack gap="x2">
          <ActionButton
            variant="neutralOutline"
            size="small"
            flexGrow={1}
            disabled={index === 0}
            onClick={previous}
          >
            되돌리기
          </ActionButton>
          <ActionButton variant="neutralOutline" size="small" flexGrow={1} onClick={next}>
            판정하지 않고 넘기기
          </ActionButton>
        </HStack>
        {picked === current.id ? (
          <ActionButton variant="neutralOutline" size="large" asChild>
            <a href={`/r/${current.id}`}>제보 상세 보기</a>
          </ActionButton>
        ) : null}
      </VStack>

      <Text textStyle="t3Regular" color="fg.neutralMuted">
        위아래 방향키로 넘기고 Enter 로 표시할 수 있습니다
      </Text>
    </ScreenBody>
  );
}
