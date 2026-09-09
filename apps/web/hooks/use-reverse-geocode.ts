"use client";

import type { LatLng } from "@rebirth/core/location/geo";
import { useEffect, useRef, useState } from "react";

// 좌표를 행정동명으로 바꿈. Geolocation 경로와 지도 이동 경로가 함께 씀

export type ReverseGeocodeResult = {
  areaName: string;
  fullName: string;
  sido: string;
  sigungu: string;
  code: string;
  coarsePoint: LatLng;
  roadAddress: string | null;
  jibunAddress: string | null;
  buildingName: string | null;
};

export type ReverseGeocodeState = {
  result: ReverseGeocodeResult | null;
  loading: boolean;
  error: string | null;
};

export function useReverseGeocode(
  point: LatLng | null,
  { withAddress = false, debounceMs = 400 } = {},
): ReverseGeocodeState {
  const [result, setResult] = useState<ReverseGeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inflight = useRef<AbortController | null>(null);

  // 좌표 객체는 매 렌더 새 참조라 값으로 비교
  const key = point ? `${point.lat},${point.lng}` : "";

  useEffect(() => {
    if (!key) return;

    const [lat, lng] = key.split(",").map(Number);

    const timer = setTimeout(async () => {
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, withAddress }),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setResult(null);
          setError(
            body?.message ??
              "현재 위치를 가져오지 못했습니다. 동이나 면을 직접 선택해 주십시오",
          );
          return;
        }
        setResult(body as ReverseGeocodeResult);
      } catch (cause) {
        // 지도를 계속 움직이면 앞 요청이 취소됨. 오류로 보지 않음
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setResult(null);
        setError("현재 위치를 가져오지 못했습니다. 동이나 면을 직접 선택해 주십시오");
      } finally {
        if (inflight.current === controller) {
          inflight.current = null;
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [key, withAddress, debounceMs]);

  useEffect(() => {
    return () => inflight.current?.abort();
  }, []);

  // 좌표가 없으면 앞 결과를 감춤. 상태를 지우면 effect 에서 동기 갱신이 됨
  if (!key) return { result: null, loading: false, error: null };
  return { result, loading, error };
}
