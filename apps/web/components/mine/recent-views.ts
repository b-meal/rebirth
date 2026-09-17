"use client";

import { useMemo, useSyncExternalStore } from "react";

// 최근 본 제보는 브라우저에만 남김. 서버로 보내지 않아 열람 기록이 계정에 붙지 않음

const KEY = "rebirth:recent-views";
const EVENT = "rebirth:recent-views-changed";
const EMPTY = "[]";

// 마이페이지에 붙이는 수. 카드 API 의 상한과 같음
export const RECENT_MAX = 12;

function read(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? EMPTY) as string[];
  } catch {
    return [];
  }
}

/** 상세 화면이 열릴 때마다 맨 앞으로 올림 */
export function rememberView(id: string) {
  try {
    const next = [id, ...read().filter((item) => item !== id)].slice(0, RECENT_MAX);
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막히면 최근 본 목록만 비어 보임
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
  };
}

function snapshot(): string {
  try {
    return sessionStorage.getItem(KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

/** 서버 렌더에는 저장소가 없어 빈 목록으로 시작함 */
export function useRecentViews(): string[] {
  const stored = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  return useMemo(() => {
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  }, [stored]);
}
