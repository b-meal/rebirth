"use client";

import { distanceKm, type LatLng } from "@rebirth/core/location/geo";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { DeviceHeadingState } from "@/hooks/use-device-heading";
import { normalizeDegrees, shortestDelta } from "@/lib/compass-heading";

// 지도 위 내 위치 표시. 점과 방향 부채꼴, 정확도 원을 한 번만 만들고 자리와 각도만 갱신
// 각도는 초당 수십 번 와서 React 를 거치지 않고 rAF 에서 마커에 직접 씀
// 생김새는 globals.css 의 rebirth-my-location 클래스, 색은 전부 SEED 변수

export type MyLocationMarkerInput = {
  map: MapLibreMap | null;
  point: LatLng | null;
  accuracyMeters: number | null;
  /** GPS 이동 방향, 나침반이 없을 때만 부채꼴에 씀 */
  course: number | null;
  heading: DeviceHeadingState;
};

// 한 프레임에 남은 차이의 이 비율만큼 돌림, 센서 잡음을 눌러 부채꼴이 떨리지 않게 함
const EASE = 0.25;

// 이보다 작은 차이는 목표에 붙이고 루프를 멈춤
const SETTLE_DEG = 0.1;

// 정확도 원이 점의 후광보다 작으면 겹쳐 보여 그리지 않음
const MIN_CIRCLE_PX = 72;

type Layer = {
  dot: Marker;
  circle: Marker;
  cone: HTMLElement;
  circleEl: HTMLElement;
};

// 화살촉. 모서리를 둥글게 하려고 clip-path 대신 SVG 의 round join 을 씀, 색은 CSS 가 넣음
const ARROW_SVG =
  '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2.5 L15.5 15 L2.5 15 Z" stroke-width="2.5" stroke-linejoin="round"/></svg>';

function build(): Layer {
  const wrap = document.createElement("div");
  wrap.className = "rebirth-my-location";
  const glow = document.createElement("div");
  glow.className = "rebirth-my-location-glow";
  const cone = document.createElement("div");
  cone.className = "rebirth-my-location-heading";
  cone.innerHTML = ARROW_SVG;
  cone.hidden = true;
  const dotEl = document.createElement("div");
  dotEl.className = "rebirth-my-location-dot";
  wrap.append(glow, cone, dotEl);

  const circleEl = document.createElement("div");
  circleEl.className = "rebirth-my-location-accuracy";

  return {
    // 지도가 돌아가도 북쪽을 가리키도록 회전을 지도 기준으로 둠
    dot: new Marker({ element: wrap, anchor: "center", rotationAlignment: "map" }),
    circle: new Marker({ element: circleEl, anchor: "center", pitchAlignment: "map" }),
    cone,
    circleEl,
  };
}

// 화면 100px 이 몇 미터인지 재서 정확도를 픽셀 지름으로 바꿈, MapLibre 의 자체 컨트롤과 같은 방식
function circleDiameterPx(map: MapLibreMap, at: LatLng, meters: number): number {
  const screen = map.project([at.lng, at.lat]);
  const east = map.unproject([screen.x + 100, screen.y]);
  const metersPerPx = (distanceKm(at, { lat: east.lat, lng: east.lng }) * 1000) / 100;
  return metersPerPx > 0 ? (2 * meters) / metersPerPx : 0;
}

export function useMyLocationMarker({
  map,
  point,
  accuracyMeters,
  course,
  heading,
}: MyLocationMarkerInput): void {
  const layer = useRef<Layer | null>(null);

  useEffect(() => {
    if (!map) return;
    const built = build();
    layer.current = built;
    return () => {
      built.dot.remove();
      built.circle.remove();
      layer.current = null;
    };
  }, [map]);

  useEffect(() => {
    const built = layer.current;
    if (!map || !built) return;
    if (!point) {
      built.dot.remove();
      built.circle.remove();
      return;
    }
    const at: [number, number] = [point.lng, point.lat];
    built.circle.setLngLat(at).addTo(map);
    built.dot.setLngLat(at).addTo(map);

    const resize = () => {
      const px = accuracyMeters ? circleDiameterPx(map, point, accuracyMeters) : 0;
      built.circleEl.hidden = px < MIN_CIRCLE_PX;
      built.circleEl.style.width = `${px.toFixed(1)}px`;
      built.circleEl.style.height = `${px.toFixed(1)}px`;
    };
    resize();
    // 축척이 바뀔 때만 미터당 픽셀이 달라짐
    map.on("zoom", resize);
    return () => {
      map.off("zoom", resize);
    };
  }, [map, point, accuracyMeters]);

  // 목표각과 현재각은 렌더와 무관해 ref 에 둠
  const target = useRef<number | null>(null);
  const current = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  // 상태 객체는 렌더마다 새로 만들어져 안의 안정된 값만 의존성에 둠
  const { status: headingStatus, subscribe } = heading;
  useEffect(() => {
    const built = layer.current;
    if (!map || !built) return;

    const tick = () => {
      frame.current = null;
      const goal = target.current;
      if (goal === null) return;
      // 첫 표본은 0 에서 돌아가지 않고 곧바로 그 방향을 가리킴
      const from = current.current ?? goal;
      const delta = shortestDelta(from, goal);
      const next = Math.abs(delta) < SETTLE_DEG ? goal : normalizeDegrees(from + delta * EASE);
      current.current = next;
      built.dot.setRotation(next);
      if (next !== goal) frame.current = requestAnimationFrame(tick);
    };
    const aim = (degrees: number) => {
      target.current = degrees;
      built.cone.hidden = false;
      if (frame.current === null) frame.current = requestAnimationFrame(tick);
    };

    // 나침반이 살아 있으면 그 값을 쓰고, 없을 때만 걷는 방향으로 대신함
    if (headingStatus === "active") {
      const unsubscribe = subscribe(aim);
      return () => {
        unsubscribe();
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
      };
    }
    if (course !== null) {
      aim(course);
      return () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
      };
    }
    built.cone.hidden = true;
    target.current = null;
  }, [map, headingStatus, subscribe, course]);
}
