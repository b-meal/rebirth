"use client";

import { useEffect } from "react";
import { Box, Text, VStack } from "@seed-design/react";
import { Marker } from "maplibre-gl";
import type { LatLng } from "@rebirth/core/location/geo";

import { useMap } from "@/hooks/use-map";

// 상세 화면의 위치 미리보기, 격자 좌표만 받아 손조작 없는 지도로 보여 줌

// 글 안에 끼운 지도라 한 화면에서 주변 도로가 보이는 정도로만 당김
const PREVIEW_ZOOM = 15;

const PREVIEW_HEIGHT = "160px";

// 지도 오버레이는 React 밖에서 그려지므로 색은 SEED CSS 변수로만 참조
const SPOT_PIN = [
  "width:20px",
  "height:20px",
  "border-radius:9999px",
  "background:var(--seed-color-bg-brand-solid)",
  "border:3px solid var(--seed-color-bg-layer-floating)",
  "box-shadow:0 0 0 8px var(--seed-color-bg-brand-weak)",
].join(";");

export type ReportLocationMapProps = {
  /** 격자 스냅한 공개용 좌표, 정확한 목격 지점이 아님 */
  point: LatLng;
  gridMeters: number;
};

export function ReportLocationMap({ point, gridMeters }: ReportLocationMapProps) {
  const { containerRef, status, map } = useMap({
    center: point,
    zoom: PREVIEW_ZOOM,
    interactive: false,
  });

  useEffect(() => {
    if (!map) return;
    const dot = document.createElement("div");
    dot.setAttribute("style", SPOT_PIN);
    const marker = new Marker({ element: dot, anchor: "center" })
      .setLngLat([point.lng, point.lat])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, point]);

  if (status === "error") return null;

  return (
    <VStack align="stretch" gap="x1_5">
      <Box
        height={PREVIEW_HEIGHT}
        borderRadius="r3"
        overflowX="hidden"
        overflowY="hidden"
        bg="bg.neutralWeak"
      >
        {/* MapLibre 가 컨테이너에 position relative 를 걸어 크기 잡는 요소를 따로 둠 */}
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </Box>
      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        제보자와 동물 보호를 위해 {gridMeters}m 격자로 넓힌 위치입니다
      </Text>
    </VStack>
  );
}
