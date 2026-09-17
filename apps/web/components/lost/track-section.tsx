"use client";

import { useEffect, useState } from "react";
import { Text, VStack } from "@seed-design/react";
import type { LatLng } from "@rebirth/core/location/geo";

import { Callout } from "seed-design/ui/callout";

import { densityLine, sinceLabel, urgencyHint } from "@/lib/report-label";
import { SectionCard, SectionTitle } from "@/components/ui/screen";
import { TrackMap } from "./track-map";

/**
 * 실종 신고 상세의 경로 카드, 확인할 후보 제보를 시간순으로 이은 추정만 보여 줌
 * 좌표와 방위각 숫자는 화면에 내보내지 않고 방향은 여덟 낱말로만 말함
 */

// 방위각을 낱말로 옮기는 표, 북에서 시계 방향 45도 간격
const BEARING_WORD = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"] as const;

function bearingWord(degree: number): string {
  const normalized = ((degree % 360) + 360) % 360;
  return BEARING_WORD[Math.round(normalized / 45) % BEARING_WORD.length] ?? "북";
}

/** 경로 API 응답 중 화면이 쓰는 값만 추림 */
type TrackResponse = {
  track: {
    nodes: {
      id: string;
      point: LatLng;
      occurredAt: string;
      areaName: string | null;
    }[];
  } | null;
  prediction: { center: LatLng; radiusKm: number; bearingDeg: number } | null;
  density: { count: number; radiusKm: number } | null;
  // 탐색 지점과 모델 해석은 외부 호출이라 빠진 채 올 수 있음
  spots?: { name: string }[] | null;
  interpretation?: {
    movement: string;
    photoConsistency: "consistent" | "mixed" | "unclear";
    searchOrder: string[];
    caution: string | null;
  } | null;
  gridMeters: number;
};

type TrackState = "loading" | "empty" | "ready" | "hidden";

export type TrackSectionProps = {
  reportId: string;
};

export function TrackSection({ reportId }: TrackSectionProps) {
  const [state, setState] = useState<TrackState>("loading");
  const [view, setView] = useState<TrackResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/lost/${reportId}/track`, { signal: controller.signal })
      .then(async (response) => {
        // 작성자만 여는 조회라 권한이 없으면 없는 말 대신 카드를 감춤
        if (!response.ok) {
          setState("hidden");
          return;
        }
        const body = (await response.json()) as TrackResponse;
        if (!body.track || body.track.nodes.length === 0) {
          setState("empty");
          return;
        }
        setView(body);
        setState("ready");
      })
      .catch(() => {
        // 화면을 떠나며 끊은 요청은 실패가 아님
        if (!controller.signal.aborted) setState("hidden");
      });

    return () => controller.abort();
  }, [reportId]);

  if (state === "hidden") return null;

  if (state === "loading") {
    return (
      <SectionCard gap="x2">
        <SectionTitle>목격이 이어진 길</SectionTitle>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          이어진 목격을 찾고 있어요
        </Text>
      </SectionCard>
    );
  }

  if (state === "empty" || !view?.track) {
    return (
      <SectionCard gap="x2">
        <SectionTitle>목격이 이어진 길</SectionTitle>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          아직 이을 만한 목격이 없어요
        </Text>
      </SectionCard>
    );
  }

  const nodes = view.track.nodes;
  const last = nodes[nodes.length - 1]!;
  const lastSeen = new Date(last.occurredAt);
  const interpretation = view.interpretation ?? null;
  // 모델이 순서를 적었으면 그것을 쓰고 없을 때만 지점 이름으로 채움
  const searchOrder =
    interpretation && interpretation.searchOrder.length > 0
      ? interpretation.searchOrder
      : (view.spots ?? []).map((spot) => spot.name);

  return (
    <SectionCard gap="x3">
      <SectionTitle>목격이 이어진 길</SectionTitle>

      {interpretation ? (
        <Text textStyle="t3Regular" color="fg.neutral">
          {interpretation.movement}
        </Text>
      ) : null}

      <TrackMap nodes={nodes} prediction={view.prediction} gridMeters={view.gridMeters} />

      <VStack align="stretch" gap="x1">
        <Text textStyle="t4Bold" color="fg.neutral">
          {last.areaName ?? "지역 미확인"}에서 {sinceLabel(lastSeen)} 마지막으로 봤어요
        </Text>
        {view.density ? (
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {densityLine(view.density)}
          </Text>
        ) : null}
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {urgencyHint(lastSeen)}
        </Text>
      </VStack>

      {view.prediction ? (
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          마지막 이동이 {bearingWord(view.prediction.bearingDeg)}쪽이라 그 방향부터 살펴보세요
        </Text>
      ) : null}

      {searchOrder.length > 0 ? (
        <VStack align="stretch" gap="x1">
          <Text textStyle="t4Bold" color="fg.neutral">
            여기부터 찾아보세요
          </Text>
          {searchOrder.map((place, index) => (
            <Text key={place} textStyle="t3Regular" color="fg.neutralMuted">
              {index + 1}. {place}
            </Text>
          ))}
        </VStack>
      ) : null}

      {interpretation?.photoConsistency === "mixed" ? (
        <Callout
          tone="warning"
          description="사진 특징이 서로 달라 다른 개체일 수 있어요"
        />
      ) : null}

      {interpretation ? (
        <Text textStyle="t2Regular" color="fg.neutralSubtle">
          AI 초안, 수정 가능
        </Text>
      ) : null}

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        같은 아이인지는 아직 확인 전이에요. 확인할 후보로 올라온 제보를 시간순으로 이은 추정
        경로예요
      </Text>
    </SectionCard>
  );
}
