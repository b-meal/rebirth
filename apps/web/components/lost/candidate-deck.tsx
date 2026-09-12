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
        title="아직 후보가 없어요"
        description="가까운 곳에 목격 제보가 올라오면 여기에 나와요"
      />
    );
  }

  if (!current) {
    return (
      <ResultSection
        size="medium"
        title="후보를 모두 봤어요"
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

      {/* 점수는 왜 그런지와 붙어 있어야 읽힘. 숫자만 크게 두면 확정으로 오해함
          면책은 화면마다 되풀이하지 않고 목록 머리에서 한 번만 밝힘 */}
      <VStack align="stretch" gap="x1">
        <Text textStyle="t6Bold" color="fg.neutral">
          유사도 {current.score}점
        </Text>
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          {current.breakdown.reason}
        </Text>
      </VStack>

      <Divider />

      <VStack align="stretch" gap="x2">
        {/* 적힌 것이 없으면 없다고 알리지 않고 줄을 그리지 않음 */}
        {current.appearance ? (
          <Text textStyle="articleBody" color="fg.neutral">
            {current.appearance}
          </Text>
        ) : null}
        {features.length > 0 ? (
          <TagGroupRoot>
            {features.map((feature) => (
              <TagGroupItem key={feature} label={feature} tone="neutralSubtle" />
            ))}
          </TagGroupRoot>
        ) : null}
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {current.areaName ?? "위치 미확인"} · {formatAbsolute(current.occurredAt)}
        </Text>
      </VStack>

      {/* 아래에 제보 상세 보기 버튼이 나타나 어디로 가는지 이미 말함 */}
      {picked === current.id ? <Callout tone="positive" description="표시해 두었어요" /> : null}

      {/* 아니에요 도 목록 뒤로만 밀어 다시 볼 수 있으므로 넘기기와 결과가 같음
          같은 일을 하는 버튼을 둘로 두면 무엇이 다른지 고민하게 됨
          되돌리기는 잘못 눌렀을 때만 필요해 첫 장이 아닐 때만 내놓음 */}
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
        {index > 0 ? (
          <ActionButton variant="ghost" size="medium" onClick={previous}>
            이전 후보로
          </ActionButton>
        ) : null}
        {picked === current.id ? (
          <ActionButton variant="neutralOutline" size="large" asChild>
            <a href={`/r/${current.id}`}>제보 상세 보기</a>
          </ActionButton>
        ) : null}
      </VStack>
    </ScreenBody>
  );
}
