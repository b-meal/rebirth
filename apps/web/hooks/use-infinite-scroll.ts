"use client";

import { useEffect, useRef } from "react";

// 목록 끝에 닿기 전에 다음 쪽을 미리 불러 두는 자리
// 바닥에서 부르면 사용자가 빈 화면을 보며 기다리게 됨
// 화면 몇 개 아래에 보이지 않는 표식을 두고 그것이 시야에 들어오면 부름

/**
 * 미리 부르기 시작하는 거리. 화면 높이의 배수
 * 두 화면이면 지금 보는 곳에서 두 판 아래에 닿기 전에 이미 요청이 나가 있음
 */
const PREFETCH_SCREENS = 2;

export type InfiniteScrollOptions = {
  /** 더 읽을 것이 남아 있는지. 없으면 관찰하지 않음 */
  hasMore: boolean;
  /** 이미 부르는 중인지. 같은 쪽을 두 번 부르지 않게 함 */
  loading: boolean;
  /** 다음 쪽을 읽는 함수 */
  onLoad: () => void;
};

/** 표식에 달 ref 를 돌려줌. 목록 끝에 빈 칸으로 두면 됨 */
export function useInfiniteScroll({ hasMore, loading, onLoad }: InfiniteScrollOptions) {
  const marker = useRef<HTMLDivElement>(null);

  // 관찰자를 다시 만들지 않으려고 최신 값만 갈아 끼움
  const latest = useRef({ hasMore, loading, onLoad });
  useEffect(() => {
    latest.current = { hasMore, loading, onLoad };
  });

  useEffect(() => {
    const target = marker.current;
    if (!target) return;

    // 지원하지 않는 환경에서는 관찰을 걸지 않음. 화면에 남은 버튼이 그 자리를 대신함
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        const { hasMore: more, loading: busy, onLoad: load } = latest.current;
        if (!more || busy) return;
        load();
      },
      {
        // 아래쪽으로 시야를 넓혀 표식이 화면에 들어오기 전에 미리 걸리게 함
        rootMargin: `0px 0px ${PREFETCH_SCREENS * 100}% 0px`,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // 한 쪽을 받은 뒤에도 표식이 그대로 시야에 남아 있을 수 있음
  // 관찰자는 드나들 때만 알려 주므로 그대로면 다시 부르지 않아 목록이 멈춤
  // 불러오기가 끝난 순간 지금 보이는지 직접 확인해 이어 감
  useEffect(() => {
    if (loading || !hasMore) return;
    const target = marker.current;
    if (!target) return;

    const box = target.getBoundingClientRect();
    const limit = window.innerHeight * (1 + PREFETCH_SCREENS);
    if (box.top <= limit) onLoad();
  }, [loading, hasMore, onLoad]);

  return marker;
}
