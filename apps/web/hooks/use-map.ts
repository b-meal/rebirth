"use client";

import type { LatLng } from "@rebirth/core/location/geo";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

// 라벨 없는 라이트 배경지도, 도로와 물길만 남고 건물명과 정류장은 그려지지 않음
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";

// 번들러가 모듈 워커를 만들지 못해 타일 해석이 멈추므로 public 의 사본을 가리킴
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

// CARTO 와 OpenStreetMap 은 출처 표기가 이용 조건이라 지도에서 지우지 않음
const ATTRIBUTION = [
  '<a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
].join(" · ");

// 서울시청, 위치 권한을 받기 전 첫 렌더 기준점
const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };

// 390px 폭에서 반경 3km 가 화면에 들어오는 축척
const DEFAULT_ZOOM = 13;

export type MapStatus = "loading" | "ready" | "error";

export type MapState = {
  // 지도를 그릴 요소에 그대로 넘김
  containerRef: (node: HTMLDivElement | null) => void;
  status: MapStatus;
  error: string | null;
  // 지도 중심, 근처 목록과 지역명 조회 기준
  center: LatLng;
  moveTo: (point: LatLng, options?: { animate?: boolean }) => void;
  map: MapLibreMap | null;
};

export function useMap(): MapState {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);

  // 스타일 로드가 끝나기 전 moveTo 가 오면 상태만 바뀌므로 생성 시점에 최신 값을 읽음
  const latest = useRef(center);
  useEffect(() => {
    latest.current = center;
  }, [center]);

  useEffect(() => {
    if (!container) return;

    setWorkerUrl(WORKER_URL);
    const instance = new MapLibreMap({
      container,
      style: STYLE_URL,
      center: [latest.current.lng, latest.current.lat],
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true, customAttribution: ATTRIBUTION },
    });

    const handleMove = () => {
      const next = instance.getCenter();
      setCenter({ lat: next.lat, lng: next.lng });
    };
    let loaded = false;
    const handleReady = () => {
      loaded = true;
      instance.resize();
      // 로드 전에 moveTo 가 왔으면 상태에만 남아 있어 여기서 한 번 맞춤
      instance.jumpTo({ center: [latest.current.lng, latest.current.lat] });
      setMap(instance);
    };
    // 로드 뒤의 타일 실패는 지도를 접을 이유가 아니라 첫 로드 실패만 오류로 봄
    const handleError = () => {
      if (loaded) return;
      setError("지도를 불러오지 못했습니다. 장소를 검색해 위치를 골라 주십시오");
    };

    instance.on("load", handleReady);
    instance.on("moveend", handleMove);
    instance.on("error", handleError);

    return () => {
      instance.remove();
      setMap(null);
    };
  }, [container]);

  const moveTo = useCallback(
    (point: LatLng, options?: { animate?: boolean }) => {
      if (!map) {
        // 지도가 없어도 선택 좌표는 유지해야 근처 목록이 이어짐
        setCenter(point);
        return;
      }
      const target = { center: [point.lng, point.lat] as [number, number] };
      if (options?.animate) map.easeTo({ ...target, duration: 500 });
      else map.jumpTo(target);
      setCenter(point);
    },
    [map],
  );

  return {
    containerRef: setContainer,
    status: error ? "error" : map ? "ready" : "loading",
    error,
    center,
    moveTo,
    map,
  };
}
