"use client";

import type { LocationCandidate } from "@rebirth/core/location/candidate";
import type { LatLng } from "@rebirth/core/location/geo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// 장소·주소 검색. REST 키가 서버 전용이라 /api/places 를 거침

export type PlaceSearchMode = "keyword" | "address" | "category";

export type UsePlaceSearchOptions = {
  mode?: PlaceSearchMode;
  // 넘기면 반경 검색과 거리순 정렬을 함
  center?: LatLng;
  radiusMeters?: number;
  category?: string;
  debounceMs?: number;
  size?: number;
};

export type PlaceSearchState = {
  query: string;
  setQuery: (value: string) => void;
  items: LocationCandidate[];
  loading: boolean;
  error: string | null;
  // 조회를 마쳤는데 결과가 없음. 안내 문구를 띄울 시점
  empty: boolean;
  // 디바운스를 기다리지 않고 즉시 조회
  searchNow: () => void;
  clear: () => void;
};

const MIN_QUERY_LENGTH = 2;

export function usePlaceSearch({
  mode = "keyword",
  center,
  radiusMeters,
  category,
  debounceMs = 300,
  size,
}: UsePlaceSearchOptions = {}): PlaceSearchState {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<LocationCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const inflight = useRef<AbortController | null>(null);

  // 좌표 객체는 매 렌더 새 참조라 값으로 비교
  const centerKey = center ? `${center.lat},${center.lng}` : "";

  const params = useMemo(() => {
    const search = new URLSearchParams({ mode });
    const trimmed = query.trim();
    if (trimmed) search.set("query", trimmed);
    if (category) search.set("category", category);
    if (centerKey) {
      const [lat, lng] = centerKey.split(",");
      search.set("lat", lat);
      search.set("lng", lng);
    }
    if (radiusMeters !== undefined) search.set("radius", String(radiusMeters));
    if (size !== undefined) search.set("size", String(size));
    return search;
  }, [mode, query, category, centerKey, radiusMeters, size]);

  // 어떤 조건으로 조회했는지 담는 키. 디바운스 대기 중에 결과 없음이 뜨는 것을 막음
  const requestKey = params.toString();
  const [settledKey, setSettledKey] = useState("");

  const needsQuery = mode !== "category";
  const ready = needsQuery ? query.trim().length >= MIN_QUERY_LENGTH : Boolean(category);

  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(async () => {
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/places?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setItems([]);
          setError(body?.message ?? "검색에 실패했습니다. 잠시 후에 다시 시도해 주십시오");
          return;
        }
        setItems(body?.items ?? []);
      } catch (cause) {
        // 새 입력이 들어와 취소된 요청은 오류가 아님
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setItems([]);
        setError("검색에 실패했습니다. 잠시 후에 다시 시도해 주십시오");
      } finally {
        // 새 입력에 밀려 취소된 요청은 조회를 마친 것으로 보지 않음
        if (inflight.current === controller) {
          inflight.current = null;
          setLoading(false);
          setSettledKey(requestKey);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [ready, params, requestKey, debounceMs, tick]);

  useEffect(() => {
    return () => inflight.current?.abort();
  }, []);

  const searchNow = useCallback(() => setTick((v) => v + 1), []);

  const clear = useCallback(() => {
    inflight.current?.abort();
    setQuery("");
    setItems([]);
    setError(null);
    setSettledKey("");
  }, []);

  return {
    query,
    setQuery,
    // 검색어가 짧아지면 앞 결과를 감춤. 상태를 지우면 effect 에서 동기 갱신이 됨
    items: ready ? items : [],
    loading: ready && loading,
    error: ready ? error : null,
    empty:
      ready &&
      !loading &&
      !error &&
      items.length === 0 &&
      settledKey === requestKey,
    searchNow,
    clear,
  };
}
