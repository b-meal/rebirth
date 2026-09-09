"use client";

import type { LatLng } from "@rebirth/core/location/geo";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeKakaoMapError,
  loadKakaoMaps,
  type KakaoMapInstance,
  type KakaoMapLibrary,
  type KakaoMapsNamespace,
} from "../lib/kakao-map";

// 서울시청. 위치 권한을 받기 전 첫 렌더 기준점
const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
const DEFAULT_LEVEL = 4;

export type KakaoMapStatus = "loading" | "ready" | "error";

export type UseKakaoMapOptions = {
  initialCenter?: LatLng;
  initialLevel?: number;
  libraries?: KakaoMapLibrary[];
  // 이동과 확대가 끝날 때마다 중심 좌표를 알림
  onCenterChange?: (center: LatLng) => void;
  // 사용자가 직접 지도를 끌어 옮겼을 때만 알림. moveTo 로 옮긴 경우는 제외
  onUserMove?: () => void;
  // 지도 중앙에 겹쳐 보여줄 원. 드래그 중에도 중심을 따라감
  circle?: MapCircle | null;
};

export type MapCircle = {
  radiusMeters: number;
  color: string;
};

export type KakaoMapState = {
  // 지도를 그릴 요소에 그대로 넘김
  containerRef: (node: HTMLDivElement | null) => void;
  status: KakaoMapStatus;
  error: string | null;
  // 지도 중심. 화면 중앙 핀이 가리키는 좌표
  center: LatLng;
  level: number;
  moveTo: (point: LatLng, options?: { animate?: boolean }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  maps: KakaoMapsNamespace | null;
  map: KakaoMapInstance | null;
};

type Loaded = { maps: KakaoMapsNamespace; map: KakaoMapInstance };

export function useKakaoMap({
  initialCenter,
  initialLevel = DEFAULT_LEVEL,
  libraries,
  onCenterChange,
  onUserMove,
  circle,
}: UseKakaoMapOptions = {}): KakaoMapState {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng>(initialCenter ?? DEFAULT_CENTER);
  const [level, setLevel] = useState(initialLevel);

  const onCenterChangeRef = useRef(onCenterChange);
  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  const onUserMoveRef = useRef(onUserMove);
  useEffect(() => {
    onUserMoveRef.current = onUserMove;
  }, [onUserMove]);

  // SDK 로드가 끝나기 전에 moveTo 가 오면 상태만 바뀌므로 생성 시점에 최신 값을 읽음
  const latest = useRef({ center, level });
  useEffect(() => {
    latest.current = { center, level };
  }, [center, level]);

  // 배열 그대로는 매 렌더 새 참조라 문자열로 비교
  const librariesKey = (libraries ?? []).join(",");

  useEffect(() => {
    if (!container) return;

    let cancelled = false;
    let detach = () => {};

    loadKakaoMaps(librariesKey ? (librariesKey.split(",") as KakaoMapLibrary[]) : [])
      .then((maps) => {
        if (cancelled) return;
        const start = latest.current;
        const map = new maps.Map(container, {
          center: new maps.LatLng(start.center.lat, start.center.lng),
          level: start.level,
        });

        const handleIdle = () => {
          const position = map.getCenter();
          const next = { lat: position.getLat(), lng: position.getLng() };
          setCenter(next);
          setLevel(map.getLevel());
          onCenterChangeRef.current?.(next);
        };
        // idle 은 moveTo 로 옮겨도 나므로 사용자 조작은 dragend 로 따로 받음
        const handleDragEnd = () => onUserMoveRef.current?.();
        maps.event.addListener(map, "idle", handleIdle);
        maps.event.addListener(map, "dragend", handleDragEnd);
        detach = () => {
          maps.event.removeListener(map, "idle", handleIdle);
          maps.event.removeListener(map, "dragend", handleDragEnd);
        };

        setLoaded({ maps, map });
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(describeKakaoMapError(cause));
      });

    return () => {
      cancelled = true;
      detach();
    };
  }, [container, librariesKey]);

  // 매 렌더 새 객체로 와도 값이 같으면 다시 그리지 않음
  const circleKey = circle ? `${circle.radiusMeters},${circle.color}` : "";
  const circleRef = useRef(circle);
  useEffect(() => {
    circleRef.current = circle;
  }, [circle]);

  useEffect(() => {
    const spec = circleRef.current;
    if (!loaded || !spec) return;
    const { maps, map } = loaded;
    const overlay = new maps.Circle({
      center: map.getCenter(),
      radius: spec.radiusMeters,
      strokeWeight: 1,
      strokeColor: spec.color,
      strokeOpacity: 0.8,
      strokeStyle: "shortdash",
      fillColor: spec.color,
      fillOpacity: 0.12,
    });
    overlay.setMap(map);

    const follow = () => overlay.setPosition(map.getCenter());
    maps.event.addListener(map, "center_changed", follow);

    // 끄는 동안에는 지도 레이어가 통째로 밀려 원이 중앙 핀과 어긋남. 그 사이에는 감춤
    const hide = () => overlay.setMap(null);
    const show = () => {
      overlay.setPosition(map.getCenter());
      overlay.setMap(map);
    };
    maps.event.addListener(map, "dragstart", hide);
    maps.event.addListener(map, "dragend", show);

    return () => {
      maps.event.removeListener(map, "center_changed", follow);
      maps.event.removeListener(map, "dragstart", hide);
      maps.event.removeListener(map, "dragend", show);
      overlay.setMap(null);
    };
  }, [loaded, circleKey]);

  const moveTo = useCallback(
    (point: LatLng, options?: { animate?: boolean }) => {
      if (!loaded) {
        // 지도가 없어도 선택 좌표는 유지해야 폼이 이어짐
        setCenter(point);
        return;
      }
      const position = new loaded.maps.LatLng(point.lat, point.lng);
      if (options?.animate) loaded.map.panTo(position);
      else loaded.map.setCenter(position);
      // setCenter 와 panTo 가 idle 을 일으키므로 상태 갱신은 리스너에 맡김
    },
    [loaded],
  );

  const changeLevel = useCallback(
    (delta: number) => {
      if (!loaded) return;
      loaded.map.setLevel(loaded.map.getLevel() + delta, { animate: true });
    },
    [loaded],
  );

  const zoomIn = useCallback(() => changeLevel(-1), [changeLevel]);
  const zoomOut = useCallback(() => changeLevel(1), [changeLevel]);

  return {
    containerRef: setContainer,
    status: error ? "error" : loaded ? "ready" : "loading",
    error,
    center,
    level,
    moveTo,
    zoomIn,
    zoomOut,
    maps: loaded?.maps ?? null,
    map: loaded?.map ?? null,
  };
}
