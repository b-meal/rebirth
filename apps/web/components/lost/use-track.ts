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

export type TrackView = {
  nodes: TrackNodeView[];
  prediction: { center: LatLng; radiusKm: number; bearingDeg: number } | null;
  density: { count: number; radiusKm: number } | null;
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

/** loading 은 조회 중, none 은 이을 목격이 없음, hidden 은 볼 권한이 없음 */
export type TrackStatus = "loading" | "none" | "hidden" | "ready";

type TrackResponse = {
  track: { nodes: TrackNodeView[] } | null;
  prediction: TrackView["prediction"];
  density: TrackView["density"];
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
        if (!body.track || body.track.nodes.length === 0) {
          setStatus("none");
          return;
        }
        setTrack({
          nodes: body.track.nodes,
          prediction: body.prediction,
          density: body.density,
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
