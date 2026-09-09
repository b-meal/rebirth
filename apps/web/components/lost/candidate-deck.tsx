"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Chip,
  Divider,
  FlexBox,
  SectionMessage,
  Typography,
} from "@wanteddev/wds";

import { CandidatePhoto } from "./candidate-photo";

// 확인할 후보를 카드로 훑음. 좌우 스와이프를 쓰지 않음
// 왼쪽으로 버리는 은유는 잃어버린 동물을 찾는 사람에게 맞지 않음
// 위로 넘김은 다음, 아래로는 이전. 제스처 없이도 버튼과 키보드로 동작함

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

// 유사도임을 점수 옆에 항상 붙임. 숫자만 보이면 확정으로 읽힘
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
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(query.matches);
    const frame = requestAnimationFrame(apply);
    query.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener("change", apply);
    };
  }, []);

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
    setPushedBack((prev) =>
      prev.includes(current.id) ? prev : [...prev, current.id],
    );
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
      <FlexBox flexDirection="column" gap="12px" sx={{ padding: "24px 16px" }}>
        <Typography variant="headline1" weight="bold">
          아직 후보가 없습니다
        </Typography>
        <Typography variant="body2">
          같은 지역에 목격 제보가 올라오면 이 화면에 후보로 나옵니다. 조회 주소를
          저장해 두고 다시 확인해 주십시오
        </Typography>
      </FlexBox>
    );
  }

  if (!current) {
    return (
      <FlexBox flexDirection="column" gap="12px" sx={{ padding: "24px 16px" }}>
        <Typography variant="headline1" weight="bold">
          후보를 모두 봤습니다
        </Typography>
        <Typography variant="body2">
          {SIMILARITY_NOTE}. 다시 보고 싶으면 처음부터 훑을 수 있습니다
        </Typography>
        <Button onClick={() => setIndex(0)}>처음부터 다시 보기</Button>
      </FlexBox>
    );
  }

  const features = [
    ...current.colors,
    ...current.conditionTags,
  ].filter(Boolean);

  return (
    <FlexBox flexDirection="column" gap="12px" sx={{ padding: "16px 16px 96px" }}>
      <FlexBox justifyContent="space-between" alignItems="center">
        <Typography variant="caption1">
          {index + 1} / {ordered.length}
        </Typography>
        <Chip size="xsmall" disableInteraction>
          {CARE_LABEL[current.careSituation]}
        </Chip>
      </FlexBox>

      <CandidatePhoto
        reportId={current.id}
        // 다음 두 장을 미리 받아 넘길 때 지연이 없게 함
        prefetchIds={ordered.slice(index + 1, index + 3).map((c) => c.id)}
        reduceMotion={reduceMotion}
      />

      <FlexBox flexDirection="column" gap="4px">
        <FlexBox gap="8px" alignItems="baseline">
          <Typography variant="title2" weight="bold">
            {current.score}점
          </Typography>
          <Typography variant="caption1">{SIMILARITY_NOTE}</Typography>
        </FlexBox>
        <Typography variant="body2">{current.breakdown.reason}</Typography>
      </FlexBox>

      {/* 배점 구성을 5개 모두 노출. 거리 35 중 31 형태 */}
      <FlexBox gap="6px" flexWrap="wrap">
        {(Object.keys(BREAKDOWN_LABEL) as (keyof typeof BREAKDOWN_LABEL)[]).map(
          (key) => (
            <Chip key={key} size="xsmall" variant="outlined" disableInteraction>
              {BREAKDOWN_LABEL[key]} {WEIGHTS[key]} 중 {current.breakdown[key]}
            </Chip>
          ),
        )}
      </FlexBox>

      <Divider />

      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="body1">
          {current.appearance ?? "외형 설명이 없습니다"}
        </Typography>
        <FlexBox gap="6px" flexWrap="wrap" sx={{ marginTop: "4px" }}>
          {features.map((feature) => (
            <Chip key={feature} size="small" disableInteraction>
              {feature}
            </Chip>
          ))}
        </FlexBox>
        <Typography variant="caption1" sx={{ marginTop: "8px" }}>
          {current.areaName ?? "위치 미확인"} · {formatAbsolute(current.occurredAt)}
        </Typography>
      </FlexBox>

      {picked === current.id ? (
        <SectionMessage variant="positive" open>
          이 후보를 표시했습니다. 제보 상세에서 더 자세히 볼 수 있습니다
        </SectionMessage>
      ) : null}

      {/* 제스처와 같은 일을 하는 버튼을 항상 렌더함 */}
      <FlexBox flexDirection="column" gap="8px">
        <FlexBox gap="8px">
          <Button
            fullWidth
            onClick={() => setPicked(current.id)}
          >
            맞는 것 같아요
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              pushBack();
              next();
            }}
          >
            아니에요
          </Button>
        </FlexBox>
        <FlexBox gap="8px">
          <Button
            fullWidth
            variant="outlined"
            color="assistive"
            size="small"
            disabled={index === 0}
            onClick={previous}
          >
            되돌리기
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="assistive"
            size="small"
            onClick={next}
          >
            판정하지 않고 넘기기
          </Button>
        </FlexBox>
        {picked === current.id ? (
          <a href={`/r/${current.id}`}>
            <Button fullWidth variant="outlined">
              제보 상세 보기
            </Button>
          </a>
        ) : null}
      </FlexBox>

      <Typography variant="caption1">
        위아래 방향키로 넘기고 Enter 로 표시할 수 있습니다
      </Typography>
    </FlexBox>
  );
}
