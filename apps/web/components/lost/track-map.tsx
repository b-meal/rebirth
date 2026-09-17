"use client";

import { useEffect } from "react";
import { Box, Text, VStack } from "@seed-design/react";
import { LngLatBounds, Marker } from "maplibre-gl";
import type { LatLng } from "@rebirth/core/location/geo";

import { useMap } from "@/hooks/use-map";

/**
 * 확인할 후보 제보를 시간순으로 이은 추정 경로와 다음 목격 예측 원
 * 개체 동일성이 확정된 경로가 아니고 격자 좌표만으로 그려 정확한 지점도 아님
 */

// 글 안에 끼운 지도라 위치 미리보기와 같은 높이를 씀
const PREVIEW_HEIGHT = "160px";

// 예측 원은 폴리곤이라 테두리가 원으로 읽힐 만큼만 각을 둠
const CIRCLE_SIDES = 64;

// 위도 1도의 실거리, 반경 km 를 좌표 폭으로 바꾸는 기준
const KM_PER_LAT_DEGREE = 111.32;

// 예측 원이 지도 테두리에 붙어 잘려 보이지 않게 두는 안쪽 여백
const FIT_PADDING = 24;

// 목격 지점이 서로 붙어 있을 때 과도하게 당겨지는 것 방지
const FIT_MAX_ZOOM = 15;

const CIRCLE_ID = "track-circle";
const LINE_ID = "track-line";

/** 지도 오버레이는 React 밖에서 그려져 색을 SEED CSS 변수로만 참조 */
function pinStyle(last: boolean): string {
  return [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:22px",
    "height:22px",
    "border-radius:9999px",
    "font-size:11px",
    "font-weight:700",
    "background:var(--seed-color-bg-brand-solid)",
    "color:var(--seed-color-fg-brand-contrast)",
    "border:2px solid var(--seed-color-bg-layer-floating)",
    // 마지막 목격만 테를 둘러 어느 것이 최근인지 번호 없이도 보이게 함
    last ? "box-shadow:0 0 0 7px var(--seed-color-bg-brand-weak)" : "",
  ].join(";");
}

/** 반경 km 를 폴리곤 좌표 고리로 폄, 경도는 위도별 실거리 축소 보정 대상 */
function circleRing(center: LatLng, radiusKm: number): [number, number][] {
  const latDelta = radiusKm / KM_PER_LAT_DEGREE;
  const lngDelta = latDelta / Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01);
  return Array.from({ length: CIRCLE_SIDES + 1 }, (_, index) => {
    const angle = (index / CIRCLE_SIDES) * 2 * Math.PI;
    return [
      center.lng + lngDelta * Math.cos(angle),
      center.lat + latDelta * Math.sin(angle),
    ];
  });
}

export type TrackMapNode = {
  id: string;
  point: LatLng;
};

export type TrackMapProps = {
  /** 시간순으로 이은 목격 지점, 마지막 원소가 가장 최근 */
  nodes: TrackMapNode[];
  /** 다음 목격 예측 원, 마지막 이동을 방향으로 삼아 넓힌 자리 */
  prediction: { center: LatLng; radiusKm: number } | null;
  gridMeters: number;
};

export function TrackMap({ nodes, prediction, gridMeters }: TrackMapProps) {
  const last = nodes.at(-1);
  const { containerRef, status, map } = useMap({
    center: prediction?.center ?? last?.point,
    interactive: false,
  });

  useEffect(() => {
    if (!map || nodes.length === 0) return;

    // MapLibre 는 CSS 변수 문자열을 못 읽어 계산된 색 값을 꺼내 넘김
    const style = getComputedStyle(document.documentElement);
    const solid = style.getPropertyValue("--seed-color-bg-brand-solid").trim();
    const weak = style.getPropertyValue("--seed-color-bg-brand-weak").trim();

    const bounds = new LngLatBounds();
    const ring = prediction ? circleRing(prediction.center, prediction.radiusKm) : null;

    if (ring) {
      map.addSource(CIRCLE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [ring] },
        },
      });
      map.addLayer({
        id: CIRCLE_ID,
        type: "fill",
        source: CIRCLE_ID,
        paint: { "fill-color": weak, "fill-opacity": 0.55 },
      });
      for (const coordinate of ring) bounds.extend(coordinate);
    }

    map.addSource(LINE_ID, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: nodes.map((node) => [node.point.lng, node.point.lat]),
        },
      },
    });
    map.addLayer({
      id: LINE_ID,
      type: "line",
      source: LINE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      // 끊긴 선으로 그려 이어 본 추정이라는 것을 눈으로도 알림
      paint: { "line-color": solid, "line-width": 3, "line-dasharray": [2, 1.5] },
    });

    const markers = nodes.map((node, index) => {
      const pin = document.createElement("div");
      pin.setAttribute("style", pinStyle(index === nodes.length - 1));
      pin.textContent = String(index + 1);
      bounds.extend([node.point.lng, node.point.lat]);
      return new Marker({ element: pin, anchor: "center" })
        .setLngLat([node.point.lng, node.point.lat])
        .addTo(map);
    });

    map.fitBounds(bounds, {
      padding: FIT_PADDING,
      maxZoom: FIT_MAX_ZOOM,
      animate: false,
    });

    return () => {
      for (const marker of markers) marker.remove();
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
      if (map.getSource(LINE_ID)) map.removeSource(LINE_ID);
      if (map.getLayer(CIRCLE_ID)) map.removeLayer(CIRCLE_ID);
      if (map.getSource(CIRCLE_ID)) map.removeSource(CIRCLE_ID);
    };
  }, [map, nodes, prediction]);

  if (status === "error") return null;

  return (
    <VStack align="stretch" gap="x1_5">
      <Box
        position="relative"
        height={PREVIEW_HEIGHT}
        borderRadius="r3"
        overflowX="hidden"
        overflowY="hidden"
        bg="bg.neutralWeak"
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </Box>

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        번호는 목격 순서이고 옅은 원은 다음에 있을 만한 자리입니다. 제보자와 동물 보호를 위해{" "}
        {gridMeters}m 격자로 넓힌 위치라 정확한 지점이 아니고, 확인할 후보를 이은 추정입니다
      </Text>
    </VStack>
  );
}
