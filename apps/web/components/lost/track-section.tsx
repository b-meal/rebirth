"use client";

import { Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

import { sinceLabel } from "@/lib/report-label";
import { SectionCard, SectionTitle } from "@/components/ui/screen";
import type { TrackStatus, TrackView } from "./use-track";

/**
 * 경로와 주변 상황을 읽어 무엇을 하면 되는지 적는 카드
 * 지도는 마지막으로 본 곳 카드가 한 장만 가지고 여기는 글만 둠
 * 규칙이 센 줄과 모델이 읽은 줄을 한 덩이에 섞지 않음. AI 초안 표기는 모델 줄에만 붙음
 * 좌표와 방위각 숫자는 화면에 내보내지 않고 방향은 여덟 낱말로만 말함
 */

// 방위각을 낱말로 옮기는 표, 북에서 시계 방향 45도 간격
const BEARING_WORD = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"] as const;

function bearingWord(degree: number): string {
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
          이어진 목격을 찾고 있어요
        </Text>
      </SectionCard>
    );
  }

  const { advice, interpretation, nodes, prediction } = track;
  const hasTrack = nodes.length > 0;
  const last = hasTrack ? nodes[nodes.length - 1]! : null;
  // 모델이 순서를 적었으면 그것을 쓰고 없을 때만 지점 이름으로 채움
  const searchOrder =
    interpretation && interpretation.searchOrder.length > 0
      ? interpretation.searchOrder
      : track.spots.map((spot) => spot.name);

  return (
    <SectionCard gap="x3">
      <SectionTitle>다음에 찾아볼 곳</SectionTitle>

      {advice ? (
        <VStack align="stretch" gap="x1">
          {/* 기준은 실종 시각이고 후보 시각은 같은 아이로 확정된 것이 아니라 따로 말함 */}
          {advice.latestCandidateAt ? (
            <Text textStyle="t3Regular" color="fg.neutral">
              가장 최근 닮은 후보는 {last?.areaName ?? "지역 미확인"}에서{" "}
              {sinceLabel(new Date(advice.latestCandidateAt))} 올라왔어요
            </Text>
          ) : null}
          {advice.lines.density ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {advice.lines.density}
            </Text>
          ) : null}
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {advice.lines.action}
          </Text>
          {prediction ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              마지막 이동이 {bearingWord(prediction.bearingDeg)}쪽이라 그 방향부터 살펴보세요
            </Text>
          ) : null}
        </VStack>
      ) : null}

      {advice?.lines.coverage ? <Callout tone="neutral" description={advice.lines.coverage} /> : null}

      {!hasTrack ? (
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          아직 이을 만한 목격이 없어요. 목격 제보가 두 건 이상 모이면 이동 경로를 그려 드려요
        </Text>
      ) : null}

      {interpretation ? (
        <VStack align="stretch" gap="x1">
          <Text textStyle="t4Bold" color="fg.neutral">
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
            AI 초안, 수정 가능
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

      {hasTrack ? (
        <Text textStyle="t2Regular" color="fg.neutralSubtle">
          같은 아이인지는 아직 확인 전이고 확인할 후보를 시간순으로 이은 추정이에요
        </Text>
      ) : null}
    </SectionCard>
  );
}
