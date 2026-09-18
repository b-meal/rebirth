"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ANIMAL_THRESHOLD, scoreAnimal, warmAnimalModel } from "@/lib/animal-model";
import type { PhotoItem } from "@/lib/image";

// 1단계 선검사. 사진을 고른 자리에서 동물이 보이는지만 물어 잘못 고른 사진을 곧바로 알림
// 판정은 알림일 뿐 다음 걸음을 막지 않음. 판정을 못 받으면 아무 말도 하지 않고 넘어감
// 2단계의 초안 분석이 같은 것을 다시 보므로 여기서 놓쳐도 한 겹이 더 남아 있음
//
// 기기 모델이 통과라고 하면 거기서 끝내고, 거른다고 하거나 모델이 없으면 서버에 물음
// 아이폰 실측으로 기기는 15ms, 서버는 726ms. 모델은 2.6MB 라 첫 방문에는 대개 서버가 받음
// 표본 108 장에서 기기가 거른 것은 1 장이라 서버로 넘어가는 사진은 얼마 되지 않음

export type PhotoVerdict = "checking" | "animal" | "not-animal" | "unknown";

/** 판정을 어디서 냈는지. 화면에는 쓰지 않고 어느 길로 갔는지 볼 때 씀 */
export type VerdictSource = "device" | "server";

// 서버가 2500ms 에서 끊지만 응답이 오는 길이 막히면 그대로 남아 이쪽에서도 끊음
const CLIENT_TIMEOUT_MS = 4000;

// 모델을 이만큼만 기다림. 넘으면 서버로 물어보는 편이 빠름
// 서버 왕복이 726ms 라 그보다 짧게 둠
const MODEL_WAIT_MS = 500;

// 시간이 다 돼 끊은 것과 사진이 빠져 끊은 것을 가르는 표
// 앞은 판정 없음으로 확정해야 하고 뒤는 쓸 곳이 없어 버림
const TIMED_OUT = Symbol("precheck-timeout");

export type PhotoPrecheckState = {
  /** 아직 묻지 않은 사진은 checking. 화면은 checking 에 아무 표시도 하지 않아도 됨 */
  verdictOf: (photoId: string) => PhotoVerdict;
  /** 동물이 보이지 않는다고 판정된 사진. 경고 문구를 띄울 대상 */
  flagged: PhotoItem[];
  /** 판정을 기기에서 냈는지 서버에서 냈는지. 아직 안 났으면 null */
  sourceOf: (photoId: string) => VerdictSource | null;
};

/** 기기에서 재 봄. 모델이 아직이거나 실패하면 null 을 돌려 서버로 넘김 */
async function askDevice(photo: PhotoItem): Promise<PhotoVerdict | null> {
  const score = await scoreAnimal(photo.precheckFile, { waitMs: MODEL_WAIT_MS });
  if (score === null) return null;
  return score >= ANIMAL_THRESHOLD ? "animal" : "not-animal";
}

async function askServer(photo: PhotoItem, signal: AbortSignal): Promise<PhotoVerdict> {
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

/**
 * 기기를 먼저 보되 거른다고 할 때만 서버에 한 번 더 물음. 어느 길로 갔는지 함께 돌려줌
 *
 * 기기 모델은 동물이 대야나 화분에 담긴 사진을 놓치는 일이 남아 있어
 * 그 판정을 그대로 내보내면 모델을 받은 사람만 X 를 보고 첫 방문자는 통과하는 어긋남이 생김
 * 거부만 서버로 넘기면 최종 답이 늘 서버 쪽이라 누가 보든 같고,
 * 통과는 기기에서 끝나 대부분의 사진은 여전히 왕복 없이 판정됨
 */
async function ask(
  photo: PhotoItem,
  signal: AbortSignal,
): Promise<{ verdict: PhotoVerdict; source: VerdictSource }> {
  const device = await askDevice(photo);
  if (device === "animal") return { verdict: device, source: "device" };
  if (signal.aborted) return { verdict: "unknown", source: "device" };
  return { verdict: await askServer(photo, signal), source: "server" };
}

export function usePhotoPrecheck(photos: PhotoItem[]): PhotoPrecheckState {
  const [results, setResults] = useState<Record<string, PhotoVerdict>>({});

  // 같은 사진을 두 번 묻지 않게 하는 표시. 판정이 끝나도 남아 있어야 함
  const asked = useRef(new Set<string>());
  const inflight = useRef(new Map<string, AbortController>());
  const sources = useRef(new Map<string, VerdictSource>());

  // 사진을 찍는 동안 모델을 받아 둠. 돌아왔을 때 이미 준비돼 있으면 판정이 곧바로 끝남
  useEffect(() => {
    warmAnimalModel();
  }, []);

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

      void ask(photo, controller.signal).then(({ verdict, source }) => {
        clearTimeout(timer);
        inflight.current.delete(photo.id);
        // 시간 초과를 여기서 버리면 판정이 영영 checking 에 머물러 기다리는 표시가 안 걷힘
        if (controller.signal.aborted && controller.signal.reason !== TIMED_OUT) return;
        sources.current.set(photo.id, source);
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

  // 판정이 난 사진에만 값이 있어 results 가 바뀔 때만 다시 만들면 됨
  const sourceOf = useCallback(
    (photoId: string): VerdictSource | null =>
      results[photoId] ? (sources.current.get(photoId) ?? null) : null,
    [results],
  );

  return {
    verdictOf,
    sourceOf,
    flagged: photos.filter((photo) => results[photo.id] === "not-animal"),
  };
}
