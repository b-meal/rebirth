"use client";

import { useEffect, useState } from "react";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconMapLocationpinLine } from "@karrotmarket/react-monochrome-icon";
import { LngLatBounds, Marker } from "maplibre-gl";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import type { LatLng } from "@rebirth/core/location/geo";

import { useMap } from "@/hooks/use-map";
import {
  MAP_PROVIDERS,
  PROVIDER_LABEL,
  openDirections,
  type MapProvider,
} from "@/lib/map-link";

/**
 * 글 하나가 가지는 지도 한 장
 * 이 글의 위치가 주인이고 뒤따르는 목격이 공식으로 이어질 때만 경로와 예측 원을 얹음
 * 개체 동일성이 확정된 경로가 아니고 격자 좌표만으로 그려 정확한 지점도 아님
 */

const PREVIEW_HEIGHT = "200px";

// 예측 원은 폴리곤이라 테두리가 원으로 읽힐 만큼만 각을 둠
const CIRCLE_SIDES = 64;

// 위도 1도의 실거리, 반경 km 를 좌표 폭으로 바꾸는 기준
const KM_PER_LAT_DEGREE = 111.32;

// 예측 원이 지도 테두리에 붙어 잘려 보이지 않게 두는 안쪽 여백
const FIT_PADDING = 28;

// 목격 지점이 서로 붙어 있을 때 과도하게 당겨지는 것 방지
const FIT_MAX_ZOOM = 15;

// 경로가 없을 때 한 화면에 주변 도로가 보이는 정도로만 당김
const SPOT_ZOOM = 15;

const CIRCLE_ID = "track-circle";
const CIRCLE_EDGE_ID = "track-circle-edge";
const LINE_ID = "track-line";

/** 이 글의 위치를 나타내는 주인 핀, 번호 없이 가장 크게 둠 */
const ORIGIN_PIN = [
  "width:20px",
  "height:20px",
  "border-radius:9999px",
  "background:var(--seed-color-bg-brand-solid)",
  "border:3px solid var(--seed-color-bg-layer-floating)",
  "box-shadow:0 0 0 8px var(--seed-color-bg-brand-weak)",
].join(";");

/**
 * 번호 핀은 서로 붙어도 앞 번호가 읽히게 작게 두고 글자는 흰색으로 둠
 * fg.brandContrast 는 bg.brandSolid 보다 한 단계 진한 같은 색이라 숫자가 묻힘
 */
function pinStyle(last: boolean): string {
  return [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:18px",
    "height:18px",
    "border-radius:9999px",
    "font-size:10px",
    "font-weight:700",
    "line-height:1",
    "background:var(--seed-color-bg-brand-solid)",
    "color:var(--seed-color-palette-static-white)",
    "border:2px solid var(--seed-color-bg-layer-floating)",
    last ? "box-shadow:0 0 0 6px var(--seed-color-bg-brand-weak)" : "",
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
  /** 이 글이 가진 격자 좌표, 지도의 주인 */
  origin: LatLng;
  gridMeters: number;
  /** 지도 앱에 넘길 도착지 이름, 없으면 눌러도 아무 일이 없음 */
  destinationName?: string;
  /** 시간순으로 이은 뒤따르는 목격, 마지막 원소가 가장 최근 */
  nodes?: TrackMapNode[];
  /** 다음 목격 예측 원, 마지막 이동을 방향으로 삼아 넓힌 자리 */
  prediction?: { center: LatLng; radiusKm: number } | null;
};

export function TrackMap({
  origin,
  gridMeters,
  destinationName,
  nodes = [],
  prediction = null,
}: TrackMapProps) {
  const { containerRef, status, map } = useMap({
    center: origin,
    zoom: SPOT_ZOOM,
    interactive: false,
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!map) return;

    // MapLibre 는 CSS 변수 문자열을 못 읽어 계산된 색 값을 꺼내 넘김
    const style = getComputedStyle(document.documentElement);
    const solid = style.getPropertyValue("--seed-color-bg-brand-solid").trim();
    const weak = style.getPropertyValue("--seed-color-bg-brand-weak").trim();

    const bounds = new LngLatBounds();
    bounds.extend([origin.lng, origin.lat]);

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
        paint: { "fill-color": weak, "fill-opacity": 0.4 },
      });
      // 끊긴 테두리로 그려 확정된 구역이 아니라 예상 범위임을 눈으로도 알림
      map.addLayer({
        id: CIRCLE_EDGE_ID,
        type: "line",
        source: CIRCLE_ID,
        paint: {
          "line-color": solid,
          "line-width": 2,
          "line-opacity": 0.85,
          "line-dasharray": [3, 2],
        },
      });
      for (const coordinate of ring) bounds.extend(coordinate);
    }

    // 주인 위치에서 시작해 뒤따르는 목격으로 이어 그림
    const path = [origin, ...nodes.map((node) => node.point)];
    if (path.length > 1) {
      map.addSource(LINE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: path.map((point) => [point.lng, point.lat]),
          },
        },
      });
      map.addLayer({
        id: LINE_ID,
        type: "line",
        source: LINE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": solid, "line-width": 3, "line-dasharray": [2, 1.5] },
      });
    }

    const originPin = document.createElement("div");
    originPin.setAttribute("style", ORIGIN_PIN);
    const markers = [
      new Marker({ element: originPin, anchor: "center" })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map),
      ...nodes.map((node, index) => {
        const pin = document.createElement("div");
        pin.setAttribute("style", pinStyle(index === nodes.length - 1));
        pin.textContent = String(index + 1);
        bounds.extend([node.point.lng, node.point.lat]);
        return new Marker({ element: pin, anchor: "center" })
          .setLngLat([node.point.lng, node.point.lat])
          .addTo(map);
      }),
    ];

    // 주인 위치만 있으면 생성 시점 축척을 그대로 두어 과하게 당기지 않음
    if (nodes.length > 0 || ring) {
      map.fitBounds(bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
        animate: false,
      });
    }

    return () => {
      for (const marker of markers) marker.remove();
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
      if (map.getSource(LINE_ID)) map.removeSource(LINE_ID);
      if (map.getLayer(CIRCLE_EDGE_ID)) map.removeLayer(CIRCLE_EDGE_ID);
      if (map.getLayer(CIRCLE_ID)) map.removeLayer(CIRCLE_ID);
      if (map.getSource(CIRCLE_ID)) map.removeSource(CIRCLE_ID);
    };
  }, [map, origin, nodes, prediction]);

  if (status === "error") return null;

  const go = (provider: MapProvider) => {
    if (!destinationName) return;
    setSheetOpen(false);
    openDirections(provider, { lat: origin.lat, lng: origin.lng, name: destinationName });
  };

  // MapLibre 가 컨테이너에 position relative 를 걸어 크기 잡는 요소를 따로 둠
  const canvas = (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        ...(destinationName && { pointerEvents: "none" as const }),
      }}
    />
  );

  const traced = nodes.length > 0;

  return (
    <VStack align="stretch" gap="x1_5">
      <Box
        position="relative"
        height={PREVIEW_HEIGHT}
        borderRadius="r3"
        overflowX="hidden"
        overflowY="hidden"
        bg="bg.neutralWeak"
        {...(destinationName && { asChild: true })}
      >
        {destinationName ? (
          <button
            type="button"
            className="rebirth-map-tap"
            aria-label={`${destinationName}까지 길찾기`}
            onClick={() => setSheetOpen(true)}
          >
            {canvas}
            {/* 지도가 오른쪽 아래에 출처 표기를 두므로 왼쪽에 붙임 */}
            <VStack
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              justify="flex-end"
              align="flex-start"
              p="x2"
              style={{ pointerEvents: "none" }}
            >
              <HStack
                gap="x1"
                align="center"
                px="x2_5"
                py="x1_5"
                borderRadius="full"
                bg="bg.layerFloating"
                boxShadow="s2"
              >
                <Icon svg={<IconMapLocationpinLine />} size="x4" color="fg.neutral" />
                <Text textStyle="t2Bold" color="fg.neutral">
                  길찾기
                </Text>
              </HStack>
            </VStack>
          </button>
        ) : (
          canvas
        )}
      </Box>

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        {traced
          ? `큰 점이 마지막으로 본 곳이고 번호는 뒤따른 목격 순서예요. 끊긴 원은 다음에 있을 만한 자리이고, 제보자와 동물 보호를 위해 ${gridMeters}m 격자로 넓힌 위치라 정확한 지점이 아니에요`
          : `제보자와 동물 보호를 위해 ${gridMeters}m 격자로 넓힌 위치예요`}
      </Text>

      <BottomSheetRoot open={sheetOpen} onOpenChange={setSheetOpen}>
        <BottomSheetContent title="길찾기">
          <BottomSheetBody>
            <VStack align="stretch" gap="x4">
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                지금 있는 곳에서 이 지점까지 안내해요. 격자로 넓힌 위치라 정확한 지점은
                아니에요
              </Text>
              <VStack align="stretch" gap="x2">
                {MAP_PROVIDERS.map((provider) => (
                  <ActionButton
                    key={provider}
                    variant="neutralWeak"
                    size="large"
                    onClick={() => go(provider)}
                  >
                    {PROVIDER_LABEL[provider]}
                  </ActionButton>
                ))}
              </VStack>
            </VStack>
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheetRoot>
    </VStack>
  );
}
