"use client";

import { useEffect, useState } from "react";
import type { LatLng } from "@rebirth/core/location/geo";

/**
 * 경로 조회를 화면 하나에서 한 번만 함
 * 지도와 설명 카드가 각자 부르면 같은 응답을 두 번 받고 지도도 두 개가 됨
 */

export type TrackNodeView = {
  id: string;
  point: LatLng;
  occurredAt: string;
  areaName: string | null;
};

/**
 * 서버가 계산한 탐색 단계와 주변 제보 상황
 * 기준 시각은 보호자가 적은 실종 시각이고 문장은 규칙에서 나와 AI 초안 표기를 붙이지 않음
 */
export type SearchAdviceView = {
  phase: "fresh" | "recent" | "stale" | "cold";
  hoursSinceLost: number;
  coverage: "quiet" | "active" | null;
  radiusKm: number;
  around: { sightings: number; candidates: number } | null;
  latestCandidateAt: string | null;
  lines: { density: string | null; action: string; coverage: string | null };
};

export type TrackView = {
  /** 이을 목격이 두 건 미만이면 빈 배열. 조언은 그래도 옴 */
  nodes: TrackNodeView[];
  prediction: { center: LatLng; radiusKm: number; bearingDeg: number } | null;
  advice: SearchAdviceView | null;
  spots: { name: string }[];
  interpretation: {
    movement: string;
    photoConsistency: "consistent" | "mixed" | "unclear";
    searchOrder: string[];
    caution: string | null;
  } | null;
  // 배점 하한을 못 넘고 외형 유사도로만 경로에 들어온 노드 수
  promotedCount: number;
};

/** loading 은 조회 중, hidden 은 볼 권한이 없음. 경로가 없어도 조언이 있으면 ready */
export type TrackStatus = "loading" | "hidden" | "ready";

type TrackResponse = {
  track: { nodes: TrackNodeView[] } | null;
  prediction: TrackView["prediction"];
  advice?: SearchAdviceView | null;
  spots?: { name: string }[] | null;
  interpretation?: TrackView["interpretation"];
  promotedCount?: number | null;
};

export function useTrack(reportId: string): {
  status: TrackStatus;
  track: TrackView | null;
} {
  const [status, setStatus] = useState<TrackStatus>("loading");
  const [track, setTrack] = useState<TrackView | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/lost/${reportId}/track`, { signal: controller.signal })
      .then(async (response) => {
        // 숨긴 신고나 끝난 신고는 남이 볼 수 없어 없는 말 대신 자리를 비움
        if (!response.ok) {
          setStatus("hidden");
          return;
        }
        const body = (await response.json()) as TrackResponse;
        setTrack({
          nodes: body.track?.nodes ?? [],
          prediction: body.prediction,
          advice: body.advice ?? null,
          spots: body.spots ?? [],
          interpretation: body.interpretation ?? null,
          promotedCount: body.promotedCount ?? 0,
        });
        setStatus("ready");
      })
      .catch(() => {
        // 화면을 떠나며 끊은 요청은 실패가 아님
        if (!controller.signal.aborted) setStatus("hidden");
      });

    return () => controller.abort();
  }, [reportId]);

  return { status, track };
}
