"use client";

import { Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

import { SectionCard, SectionTitle } from "@/components/ui/screen";
import type { TrackStatus, TrackView } from "./use-track";

/**
 * 지금 할 일 한 줄, 그 근거 숫자 한 줄, 먼저 가 볼 곳 목록만 두는 카드
 * 지도와 타임라인은 위 카드가 가지므로 지역명과 시각을 여기서 되풀이하지 않음
 * 규칙이 센 줄과 모델이 읽은 줄을 한 덩이에 섞지 않음. AI 초안 표기는 모델 줄에만 붙음
 * 좌표와 방위각 숫자는 화면에 내보내지 않고 방향은 여덟 낱말로만 말함
 */

// 방위각을 낱말로 옮기는 표, 북에서 시계 방향 45도 간격
const BEARING_WORD = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"] as const;

export function bearingWord(degree: number): string {
  const normalized = ((degree % 360) + 360) % 360;
  return BEARING_WORD[Math.round(normalized / 45) % BEARING_WORD.length] ?? "북";
}

export type TrackSectionProps = {
  status: TrackStatus;
  track: TrackView | null;
};

export function TrackSection({ status, track }: TrackSectionProps) {
  if (status === "hidden") return null;

  if (status === "loading" || !track) {
    return (
      <SectionCard gap="x2">
        <SectionTitle>다음에 찾아볼 곳</SectionTitle>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          주변 제보를 세고 있어요
        </Text>
      </SectionCard>
    );
  }

  const { advice, interpretation, prediction } = track;
  // 모델이 순서를 적었으면 그것을 쓰고 없을 때만 지점 이름으로 채움
  const searchOrder =
    interpretation && interpretation.searchOrder.length > 0
      ? interpretation.searchOrder
      : track.spots.map((spot) => spot.name);
  // 제보가 없는 곳은 밀도 줄과 커버리지 줄이 같은 말이라 공유를 권하는 쪽만 남김
  const quiet = advice?.lines.coverage ?? null;
  const evidence = quiet && advice?.around?.sightings === 0 ? null : advice?.lines.density;
  // 모델이 이동 방향을 읽었으면 규칙의 방향 줄은 같은 말이라 뺌
  const direction =
    prediction && !interpretation
      ? `마지막 이동이 ${bearingWord(prediction.bearingDeg)}쪽이라 그 방향부터 살펴보세요`
      : null;

  return (
    <SectionCard gap="x3">
      <SectionTitle>다음에 찾아볼 곳</SectionTitle>

      {advice ? (
        <VStack align="stretch" gap="x1">
          <Text textStyle="t4Bold" color="fg.neutral">
            {advice.lines.action}
          </Text>
          {evidence ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {evidence}
            </Text>
          ) : null}
          {direction ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {direction}
            </Text>
          ) : null}
        </VStack>
      ) : null}

      {quiet ? <Callout tone="neutral" description={quiet} /> : null}

      {/* 배점 하한을 못 넘고 외형만 닮아 이어 붙인 노드는 따로 세어 둠 */}
      {track.promotedCount > 0 ? (
        <Text textStyle="t2Regular" color="fg.neutralMuted">
          외형이 닮아 이어 붙인 확인할 후보 {track.promotedCount}건
        </Text>
      ) : null}

      {interpretation ? (
        <VStack align="stretch" gap="x1">
          <Text textStyle="t3Regular" color="fg.neutral">
            {interpretation.movement}
          </Text>
          {searchOrder.map((place, index) => (
            <Text key={place} textStyle="t3Regular" color="fg.neutral">
              {index + 1}. {place}
            </Text>
          ))}
          {interpretation.photoConsistency === "mixed" ? (
            <Callout tone="warning" description="사진 특징이 서로 달라 다른 개체일 수 있어요" />
          ) : null}
          <Text textStyle="t2Regular" color="fg.neutralSubtle">
            AI 초안
          </Text>
        </VStack>
      ) : searchOrder.length > 0 ? (
        <VStack align="stretch" gap="x1">
          {searchOrder.map((place, index) => (
            <Text key={place} textStyle="t3Regular" color="fg.neutral">
              {index + 1}. {place}
            </Text>
          ))}
        </VStack>
      ) : null}
    </SectionCard>
  );
}
