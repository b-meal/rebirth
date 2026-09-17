"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PhotoItem } from "@/lib/image";

// 1단계 선검사. 사진을 고른 자리에서 동물이 보이는지만 물어 잘못 고른 사진을 곧바로 알림
// 판정은 알림일 뿐 다음 걸음을 막지 않음. 판정을 못 받으면 아무 말도 하지 않고 넘어감
// 2단계의 초안 분석이 같은 것을 다시 보므로 여기서 놓쳐도 한 겹이 더 남아 있음

export type PhotoVerdict = "checking" | "animal" | "not-animal" | "unknown";

// 서버가 2500ms 에서 끊지만 응답이 오는 길이 막히면 그대로 남아 이쪽에서도 끊음
const CLIENT_TIMEOUT_MS = 4000;

// 시간이 다 돼 끊은 것과 사진이 빠져 끊은 것을 가르는 표
// 앞은 판정 없음으로 확정해야 하고 뒤는 쓸 곳이 없어 버림
const TIMED_OUT = Symbol("precheck-timeout");

export type PhotoPrecheckState = {
  /** 아직 묻지 않은 사진은 checking. 화면은 checking 에 아무 표시도 하지 않아도 됨 */
  verdictOf: (photoId: string) => PhotoVerdict;
  /** 동물이 보이지 않는다고 판정된 사진. 경고 문구를 띄울 대상 */
  flagged: PhotoItem[];
};

async function ask(photo: PhotoItem, signal: AbortSignal): Promise<PhotoVerdict> {
  const form = new FormData();
  form.append("photo", photo.precheckFile);
  try {
    const response = await fetch("/api/draft/precheck", {
      method: "POST",
      body: form,
      signal,
    });
    if (!response.ok) return "unknown";
    const payload = (await response.json()) as { verdict?: string };
    if (payload.verdict === "animal") return "animal";
    if (payload.verdict === "not-animal") return "not-animal";
    return "unknown";
  } catch {
    // 끊김, 시간 초과, 오프라인이 모두 여기로 옴. 판정 없이 넘김
    return "unknown";
  }
}

export function usePhotoPrecheck(photos: PhotoItem[]): PhotoPrecheckState {
  const [results, setResults] = useState<Record<string, PhotoVerdict>>({});

  // 같은 사진을 두 번 묻지 않게 하는 표시. 판정이 끝나도 남아 있어야 함
  const asked = useRef(new Set<string>());
  const inflight = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const alive = new Set(photos.map((photo) => photo.id));

    // 다시 찍기로 빠진 사진은 답을 기다릴 이유가 없음
    for (const [id, controller] of inflight.current) {
      if (alive.has(id)) continue;
      controller.abort();
      inflight.current.delete(id);
      asked.current.delete(id);
    }

    for (const photo of photos) {
      if (asked.current.has(photo.id)) continue;
      asked.current.add(photo.id);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(TIMED_OUT), CLIENT_TIMEOUT_MS);
      inflight.current.set(photo.id, controller);

      void ask(photo, controller.signal).then((verdict) => {
        clearTimeout(timer);
        inflight.current.delete(photo.id);
        // 시간 초과를 여기서 버리면 판정이 영영 checking 에 머물러 기다리는 표시가 안 걷힘
        if (controller.signal.aborted && controller.signal.reason !== TIMED_OUT) return;
        setResults((previous) => ({ ...previous, [photo.id]: verdict }));
      });
    }
  }, [photos]);

  useEffect(
    () => () => {
      // 화면을 떠나면 모두 끊고 표시도 지움
      // StrictMode 는 마운트를 두 번 흉내 내는데 표시가 남으면 판정이 영영 안 옴
      for (const [id, controller] of inflight.current) {
        controller.abort();
        asked.current.delete(id);
      }
      inflight.current.clear();
    },
    [],
  );

  const verdictOf = useCallback(
    (photoId: string): PhotoVerdict => results[photoId] ?? "checking",
    [results],
  );

  return {
    verdictOf,
    flagged: photos.filter((photo) => results[photo.id] === "not-animal"),
  };
}
