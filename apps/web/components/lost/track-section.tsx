"use client";

import { Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

import { situationLine } from "@/lib/report-label";
import { SectionCard, SectionTitle } from "@/components/ui/screen";
import type { TrackStatus, TrackView } from "./use-track";

/**
 * 경로를 읽어 무엇을 하면 되는지 적는 카드
 * 지도는 마지막으로 본 곳 카드가 한 장만 가지고 여기는 글만 둠
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

  if (status === "loading") {
    return (
      <SectionCard gap="x2">
        <SectionTitle>다음에 찾아볼 곳</SectionTitle>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          이어진 목격을 찾고 있어요
        </Text>
      </SectionCard>
    );
  }

  if (status === "none" || !track) {
    return (
      <SectionCard gap="x2">
        <SectionTitle>다음에 찾아볼 곳</SectionTitle>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          아직 이을 만한 목격이 없어요. 목격 제보가 두 건 이상 모이면 이동 경로를 그려 드려요
        </Text>
      </SectionCard>
    );
  }

  const last = track.nodes[track.nodes.length - 1]!;
  const lastSeen = new Date(last.occurredAt);
  const { interpretation } = track;
  // 모델이 순서를 적었으면 그것을 쓰고 없을 때만 지점 이름으로 채움
  const searchOrder =
    interpretation && interpretation.searchOrder.length > 0
      ? interpretation.searchOrder
      : track.spots.map((spot) => spot.name);

  return (
    <SectionCard gap="x3">
      <SectionTitle>다음에 찾아볼 곳</SectionTitle>

      {interpretation ? (
        <Text textStyle="t4Bold" color="fg.neutral">
          {interpretation.movement}
        </Text>
      ) : null}

      {/* 배점 하한을 못 넘고 외형만 닮아 이어 붙인 노드는 따로 세어 둠 */}
      {track.promotedCount > 0 ? (
        <Text textStyle="t2Regular" color="fg.neutralMuted">
          외형이 닮아 이어 붙인 확인할 후보 {track.promotedCount}건
        </Text>
      ) : null}

      <VStack align="stretch" gap="x1">
        <Text textStyle="t3Regular" color="fg.neutral">
          {last.areaName ?? "지역 미확인"}에서 마지막으로 봤어요
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {situationLine({
            lastSeen,
            count: track.density?.count ?? null,
            radiusKm: track.density?.radiusKm ?? null,
          })}
        </Text>
        {track.prediction ? (
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            마지막 이동이 {bearingWord(track.prediction.bearingDeg)}쪽이라 그 방향부터
            살펴보세요
          </Text>
        ) : null}
      </VStack>

      {searchOrder.length > 0 ? (
        <VStack align="stretch" gap="x1">
          {searchOrder.map((place, index) => (
            <Text key={place} textStyle="t3Regular" color="fg.neutral">
              {index + 1}. {place}
            </Text>
          ))}
        </VStack>
      ) : null}

      {interpretation?.photoConsistency === "mixed" ? (
        <Callout tone="warning" description="사진 특징이 서로 달라 다른 개체일 수 있어요" />
      ) : null}

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        {interpretation
          ? "AI 초안, 수정 가능. 같은 아이인지는 아직 확인 전이고 확인할 후보를 시간순으로 이은 추정이에요"
          : "같은 아이인지는 아직 확인 전이고 확인할 후보를 시간순으로 이은 추정이에요"}
      </Text>
    </SectionCard>
  );
}
