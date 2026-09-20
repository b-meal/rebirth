"use client";

import { useEffect, useState } from "react";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconMapLocationpinLine } from "@karrotmarket/react-monochrome-icon";
import {
  LngLatBounds,
  Marker,
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
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

// 번호가 서로 겹치지 않을 만큼은 벌려야 해 미리보기 상한을 한 단계 올림
const FIT_MAX_ZOOM = 16;

// 선을 앞에서부터 그리는 시간
const DRAW_MS = 1400;

// 번호와 예측 원이 켜지는 시간
const FADE_MS = 320;

// 경로가 없을 때 한 화면에 주변 도로가 보이는 정도로만 당김
const SPOT_ZOOM = 15;

const CIRCLE_ID = "track-circle";
const CIRCLE_EDGE_ID = "track-circle-edge";
const CIRCLE_OUTER_ID = "track-circle-outer";
const CIRCLE_OUTER_EDGE_ID = "track-circle-outer-edge";
const LINE_ID = "track-line";
const GUESS_ID = "track-guess";

// 확산 가정에서 안쪽 원이 약 39%, 바깥 원이 약 86% 를 덮는 배수
const RING_OUTER_FACTOR = 2;

// 화살표 머리 밑변과 높이, clip-path 로 몸통을 잘라 낼 때 쓰는 기준
const ARROW_WIDTH = 14;
const ARROW_HEAD = 13;

// 핀 공통, 흰 테와 그림자로 배경지도에서 떠 보이게 함
const PIN_BASE = [
  "display:flex",
  "align-items:center",
  "justify-content:center",
  "box-sizing:border-box",
  "font-weight:700",
  "line-height:1",
  "letter-spacing:-0.01em",
  "border-radius:9999px",
  "border:2.5px solid var(--seed-color-bg-layer-floating)",
  "box-shadow:var(--seed-shadow-s2)",
];

/** 보호자가 마지막으로 본 곳, 무엇인지는 아래 타임라인이 말해 글자 없이 점으로 둠 */
const ORIGIN_PIN = [
  ...PIN_BASE,
  "width:20px",
  "height:20px",
  "background:var(--seed-color-bg-warning-solid)",
].join(";");

/** MapLibre 가 겉 상자의 transform 으로 위치를 잡아 애니메이션은 속 상자에만 걺 */
function mount(map: MapLibreMap, at: LatLng, inner: HTMLElement): Marker {
  const shell = document.createElement("div");
  shell.appendChild(inner);
  return new Marker({ element: shell, anchor: "center" })
    .setLngLat([at.lng, at.lat])
    .addTo(map);
}

/**
 * 마지막 목격에 꼬리를 두고 방위각 쪽으로 뻗는 화살표
 * 받은 길이만큼 상자를 늘려 머리가 예측 중심 자리에 닿게 함
 * 몸통은 예측 점선이 이미 그려 clip-path 로 머리만 남김
 */
function arrowStyle(bearingDeg: number, lengthPx: number): string {
  return [
    `width:${ARROW_WIDTH}px`,
    `height:${lengthPx}px`,
    `clip-path:polygon(${ARROW_WIDTH / 2}px 0, ${ARROW_WIDTH}px ${ARROW_HEAD}px, 0 ${ARROW_HEAD}px)`,
    "background:var(--seed-color-fg-neutral-subtle)",
    "filter:drop-shadow(0 0 2.5px var(--seed-color-bg-layer-floating))",
    "opacity:0",
    `transform:${arrowSpin(bearingDeg)} scale(0.4)`,
    `transition:opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
  ].join(";");
}

/** 상자 중심을 방위각 쪽으로 절반 밀어 꼬리를 마커 좌표에 맞추는 변환 */
function arrowSpin(bearingDeg: number): string {
  return `rotate(${bearingDeg}deg) translateY(-50%)`;
}

/**
 * 번호 핀은 서로 붙어도 앞 번호가 읽히게 작게 두고 글자는 흰색으로 둠
 * fg.brandContrast 는 bg.brandSolid 보다 한 단계 진한 같은 색이라 숫자가 묻힘
 * 마지막 목격에 테를 두르면 그 테가 앞 번호를 가려 방향 화살표로 대신 알림
 */
function pinStyle(last: boolean): string {
  const size = last ? 26 : 22;
  return [
    ...PIN_BASE,
    `width:${size}px`,
    `height:${size}px`,
    `font-size:${last ? 12 : 11}px`,
    "background:var(--seed-color-bg-brand-solid)",
    "color:var(--seed-color-palette-static-white)",
    // 가장 최근 목격만 한 치수 크게 두어 테를 덧대지 않고도 눈에 먼저 들어옴
    last ? "background:var(--seed-color-bg-brand-solid-pressed)" : "",
    "opacity:0",
    "transform:scale(0.4)",
    `transition:opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
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
  prediction?: { center: LatLng; radiusKm: number; bearingDeg?: number } | null;
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
    // 예측은 확정된 목격과 같은 색을 쓰면 사실처럼 읽혀 무채색으로 내림
    const guessLine = style.getPropertyValue("--seed-color-fg-neutral-subtle").trim();
    const guessFill = style.getPropertyValue("--seed-color-bg-neutral-weak").trim();

    const bounds = new LngLatBounds();
    bounds.extend([origin.lng, origin.lat]);

    const ring = prediction ? circleRing(prediction.center, prediction.radiusKm) : null;
    if (prediction && ring) {
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
        paint: {
          "fill-color": guessFill,
          "fill-opacity": 0,
          "fill-opacity-transition": { duration: FADE_MS, delay: 0 },
        },
      });
      // 끊긴 테두리로 그려 확정된 구역이 아니라 예상 범위임을 눈으로도 알림
      map.addLayer({
        id: CIRCLE_EDGE_ID,
        type: "line",
        source: CIRCLE_ID,
        paint: {
          "line-color": guessLine,
          "line-width": 2.5,
          "line-opacity": 0,
          "line-opacity-transition": { duration: FADE_MS, delay: 0 },
          "line-dasharray": [3, 2],
        },
      });

      /**
       * 바깥 원은 더 멀리까지 갔을 수 있다는 뜻이라 채움 없이 테두리만 둠
       * 안쪽보다 옅게 깔아 두 경계 중 어느 쪽이 더 가능성이 높은지 구분됨
       */
      const outerRing = circleRing(prediction.center, prediction.radiusKm * RING_OUTER_FACTOR);
      map.addSource(CIRCLE_OUTER_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [outerRing] },
        },
      });
      map.addLayer({
        id: CIRCLE_OUTER_EDGE_ID,
        type: "line",
        source: CIRCLE_OUTER_ID,
        paint: {
          "line-color": guessLine,
          "line-width": 1.5,
          "line-opacity": 0,
          "line-opacity-transition": { duration: FADE_MS, delay: 0 },
          "line-dasharray": [3, 3],
        },
      });
      // 바깥 링이 안쪽 링을 품어 이 좌표만 넣어도 두 원이 화면 안에 들어옴
      for (const coordinate of outerRing) bounds.extend(coordinate);
    }

    // 주인 위치에서 시작해 뒤따르는 목격으로 이어 그림
    const path = [origin, ...nodes.map((node) => node.point)];
    const line = path.map((point) => [point.lng, point.lat] as [number, number]);
    if (line.length > 1) {
      map.addSource(LINE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: line },
        },
      });
      map.addLayer({
        id: LINE_ID,
        type: "line",
        source: LINE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": solid, "line-width": 4 },
      });
    }

    const originPin = document.createElement("div");
    originPin.setAttribute("style", ORIGIN_PIN);
    const pins: HTMLDivElement[] = [];
    const markers = [
      mount(map, origin, originPin),
      ...nodes.map((node, index) => {
        const pin = document.createElement("div");
        pin.setAttribute("style", pinStyle(index === nodes.length - 1));
        pin.textContent = String(index + 1);
        pins.push(pin);
        bounds.extend([node.point.lng, node.point.lat]);
        return mount(map, node.point, pin);
      }),
    ];

    const lastNode = nodes.at(-1);

    // 마지막 목격에서 예측 중심까지는 아직 일어나지 않은 일이라 회색 점선으로 이음
    if (prediction && lastNode) {
      map.addSource(GUESS_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [lastNode.point.lng, lastNode.point.lat],
              [prediction.center.lng, prediction.center.lat],
            ],
          },
        },
      });
      map.addLayer({
        id: GUESS_ID,
        type: "line",
        source: GUESS_ID,
        layout: { "line-cap": "round" },
        paint: {
          "line-color": guessLine,
          "line-width": 2.5,
          "line-opacity": 0,
          "line-opacity-transition": { duration: FADE_MS, delay: 0 },
          "line-dasharray": [2, 2],
        },
      });
    }

    // 주인 위치만 있으면 생성 시점 축척을 그대로 두어 과하게 당기지 않음
    if (nodes.length > 0 || ring) {
      map.fitBounds(bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
        animate: false,
      });
    }

    // 축척이 정해진 뒤라야 화면 거리를 재 화살표 길이에 쓸 수 있어 fitBounds 다음에 둠
    let arrowPin: HTMLDivElement | null = null;
    if (prediction && typeof prediction.bearingDeg === "number" && lastNode) {
      const tail = map.project([lastNode.point.lng, lastNode.point.lat]);
      const head = map.project([prediction.center.lng, prediction.center.lat]);
      const reach = Math.max(Math.hypot(head.x - tail.x, head.y - tail.y), ARROW_HEAD);
      arrowPin = document.createElement("div");
      arrowPin.setAttribute("style", arrowStyle(prediction.bearingDeg, reach));
      arrowPin.dataset.spin = `${arrowSpin(prediction.bearingDeg)} scale(1)`;
      markers.push(mount(map, lastNode.point, arrowPin));
    }

    const reveal = (element: HTMLElement) => {
      element.style.opacity = "1";
      element.style.transform = element.dataset.spin ?? "scale(1)";
    };

    const settle = () => {
      for (const pin of pins) reveal(pin);
      if (arrowPin) reveal(arrowPin);
      if (ring) {
        map.setPaintProperty(CIRCLE_ID, "fill-opacity", 0.55);
        map.setPaintProperty(CIRCLE_EDGE_ID, "line-opacity", 0.9);
        map.setPaintProperty(CIRCLE_OUTER_EDGE_ID, "line-opacity", 0.45);
      }
      if (map.getLayer(GUESS_ID)) map.setPaintProperty(GUESS_ID, "line-opacity", 0.8);
    };

    // 손떨림 줄이기를 켠 사용자는 그리는 과정을 보지 않고 결과만 받음
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || line.length < 2) {
      settle();
      return () => {
        for (const marker of markers) marker.remove();
        // 이 경로도 GUESS 를 지워야 다음 실행의 addSource 가 중복 id 로 막히지 않음
        if (map.getLayer(GUESS_ID)) map.removeLayer(GUESS_ID);
        if (map.getSource(GUESS_ID)) map.removeSource(GUESS_ID);
        if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
        if (map.getSource(LINE_ID)) map.removeSource(LINE_ID);
        if (map.getLayer(CIRCLE_OUTER_EDGE_ID)) map.removeLayer(CIRCLE_OUTER_EDGE_ID);
        if (map.getSource(CIRCLE_OUTER_ID)) map.removeSource(CIRCLE_OUTER_ID);
        if (map.getLayer(CIRCLE_EDGE_ID)) map.removeLayer(CIRCLE_EDGE_ID);
        if (map.getLayer(CIRCLE_ID)) map.removeLayer(CIRCLE_ID);
        if (map.getSource(CIRCLE_ID)) map.removeSource(CIRCLE_ID);
      };
    }

    /**
     * 선을 앞에서부터 그려 목격이 이어진 순서를 눈으로 따라가게 함
     * 선 끝이 지점에 닿는 순간 그 번호가 뜨고 마지막에 방향과 예측 원이 켜짐
     */
    const source = map.getSource(LINE_ID) as GeoJSONSource | undefined;
    const spans = line.slice(1).map((point, index) => {
      const from = line[index]!;
      return Math.hypot(point[0] - from[0], point[1] - from[1]);
    });
    const total = spans.reduce((sum, span) => sum + span, 0);
    let frame = 0;
    const startedAt = performance.now();

    const step = (now: number) => {
      const ratio = Math.min((now - startedAt) / DRAW_MS, 1);
      // 처음이 빠르고 끝이 느려 걸어간 느낌을 냄
      const eased = 1 - (1 - ratio) ** 2;
      let walked = eased * total;
      const drawn: [number, number][] = [line[0]!];

      for (let index = 0; index < spans.length; index += 1) {
        const span = spans[index]!;
        const next = line[index + 1]!;
        if (walked >= span || span === 0) {
          drawn.push(next);
          walked -= span;
          const pin = pins[index];
          if (pin) reveal(pin);
          continue;
        }
        const at = walked / span;
        const from = line[index]!;
        drawn.push([
          from[0] + (next[0] - from[0]) * at,
          from[1] + (next[1] - from[1]) * at,
        ]);
        break;
      }

      source?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: drawn },
      });

      if (ratio < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      settle();
    };

    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      for (const marker of markers) marker.remove();
      if (map.getLayer(GUESS_ID)) map.removeLayer(GUESS_ID);
      if (map.getSource(GUESS_ID)) map.removeSource(GUESS_ID);
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
      if (map.getSource(LINE_ID)) map.removeSource(LINE_ID);
      if (map.getLayer(CIRCLE_OUTER_EDGE_ID)) map.removeLayer(CIRCLE_OUTER_EDGE_ID);
      if (map.getSource(CIRCLE_OUTER_ID)) map.removeSource(CIRCLE_OUTER_ID);
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
          ? `초록 실선은 실제로 목격된 자리를 이은 것이고 회색 점선과 원은 아직 확인되지 않은 추정이에요. 제보자와 동물 보호를 위해 ${gridMeters}m 격자로 넓힌 위치예요`
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
