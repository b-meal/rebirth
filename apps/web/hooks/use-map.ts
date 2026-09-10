"use client";

import type { LatLng } from "@rebirth/core/location/geo";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

// 라벨 없는 라이트 배경지도, 도로와 물길만 남고 건물명과 정류장은 그려지지 않음
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";

// 번들러가 모듈 워커를 만들지 못해 타일 해석이 멈추므로 public 의 사본을 가리킴
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

// 서울시청, 위치 권한을 받기 전 첫 렌더 기준점
const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };

// 390px 폭에서 반경 3km 가 화면에 들어오는 축척
const DEFAULT_ZOOM = 13;

export type MapStatus = "loading" | "ready" | "error";

export type MapOptions = {
  center?: LatLng;
  zoom?: number;
  /** 끄면 손가락 조작을 받지 않음, 글 안에 끼운 지도가 스크롤을 잡아채지 않게 함 */
  interactive?: boolean;
  /** 끄면 지도 안 출처 표기를 감춤, 대신 부르는 쪽이 화면에 출처를 적어야 함 */
  attribution?: boolean;
};

export type MapState = {
  // 지도를 그릴 요소에 그대로 넘김
  containerRef: (node: HTMLDivElement | null) => void;
  status: MapStatus;
  error: string | null;
  // 지도 중심, 근처 목록과 지역명 조회 기준
  center: LatLng;
  moveTo: (
    point: LatLng,
    options?: { animate?: boolean; zoom?: number; offset?: [number, number] },
  ) => void;
  map: MapLibreMap | null;
};

export function useMap(options: MapOptions = {}): MapState {
  // 생성 시점 값만 씀, 이후에 바뀌어도 지도를 다시 만들지 않음
  const [config] = useState(options);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng>(config.center ?? DEFAULT_CENTER);

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
      zoom: config.zoom ?? DEFAULT_ZOOM,
      interactive: config.interactive ?? true,
      // 스타일이 CARTO 와 OpenStreetMap 표기를 이미 넣어 따로 덧붙이지 않음
      attributionControl: config.attribution === false ? false : { compact: true },
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
      // 손조작이 없는 지도는 출처 표기가 스스로 접히지 않아 한 번 접어 둠
      if (config.interactive === false) {
        container
          .querySelector(".maplibregl-ctrl-attrib")
          ?.classList.remove("maplibregl-compact-show");
      }
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
  }, [container, config]);

  const moveTo = useCallback(
    (
      point: LatLng,
      options?: { animate?: boolean; zoom?: number; offset?: [number, number] },
    ) => {
      if (!map) {
        // 지도가 없어도 선택 좌표는 유지해야 근처 목록이 이어짐
        setCenter(point);
        return;
      }
      const target = {
        center: [point.lng, point.lat] as [number, number],
        ...(options?.zoom !== undefined && { zoom: options.zoom }),
        // 말풍선이 위로 열려 검색창에 가리지 않게 대상 지점을 아래로 내림
        ...(options?.offset && { offset: options.offset }),
      };
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
