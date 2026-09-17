"use client";

import type { LatLng } from "@rebirth/core/location/geo";
import { useCallback, useEffect, useState } from "react";

import { whenSplashGone } from "@/lib/splash-gate";

// 브라우저 위치 조회. 권한 거부와 실패에서 폼이 멈추지 않도록 상태를 나눠 돌려줌

export type CurrentPositionStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "timeout"
  | "unavailable";

export type CurrentPositionState = {
  status: CurrentPositionStatus;
  point: LatLng | null;
  accuracyMeters: number | null;
  error: string | null;
  request: () => void;
};

// 고정밀 측위를 기다리는 시간, 데스크톱은 이 안에 못 잡는 일이 잦음
const TIMEOUT_MS = 5000;

// 고정밀이 늦을 때 대략 위치로 한 번 더 묻는 시간
const COARSE_TIMEOUT_MS = 7000;

// 권한을 주지 않아도 제보를 끝낼 수 있다는 점을 함께 알림
const MESSAGE: Record<"denied" | "timeout" | "unavailable", string> = {
  denied:
    "현재 위치를 허용하지 않아도 제보할 수 있습니다. 목격한 동이나 면을 직접 선택해 주십시오",
  timeout: "현재 위치를 확인하는 데 오래 걸립니다. 동이나 면을 직접 선택해 주십시오",
  unavailable: "현재 위치를 가져오지 못했습니다. 동이나 면을 직접 선택해 주십시오",
};

type Outcome =
  | { ok: true; point: LatLng; accuracyMeters: number | null }
  | { ok: false; status: "denied" | "timeout" | "unavailable" };

function ask(options: PositionOptions): Promise<Outcome> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracyMeters: position.coords.accuracy ?? null,
        }),
      (cause) => {
        if (cause.code === cause.PERMISSION_DENIED) {
          resolve({ ok: false, status: "denied" });
          return;
        }
        resolve({
          ok: false,
          status: cause.code === cause.TIMEOUT ? "timeout" : "unavailable",
        });
      },
      options,
    );
  });
}

/** 고정밀로 먼저 묻고 늦으면 대략 위치로 물러섬, 권한 거부는 다시 묻지 않음 */
async function locate(): Promise<Outcome> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, status: "unavailable" };
  }
  const precise = await ask({
    enableHighAccuracy: true,
    timeout: TIMEOUT_MS,
    maximumAge: 30_000,
  });
  if (precise.ok || precise.status === "denied") return precise;
  return ask({
    enableHighAccuracy: false,
    timeout: COARSE_TIMEOUT_MS,
    maximumAge: 300_000,
  });
}

/** 팝업이 뜰 차례인지. 이미 허용했거나 막아 둔 브라우저는 화면을 가리지 않아 기다릴 일이 없음 */
async function willPrompt(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.permissions) return true;
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state === "prompt";
  } catch {
    return true;
  }
}

export function useCurrentPosition({
  immediate = false,
}: { immediate?: boolean } = {}): CurrentPositionState {
  const [status, setStatus] = useState<CurrentPositionStatus>(
    immediate ? "requesting" : "idle",
  );
  const [point, setPoint] = useState<LatLng | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((outcome: Outcome) => {
    if (outcome.ok) {
      setPoint(outcome.point);
      setAccuracyMeters(outcome.accuracyMeters);
      setStatus("granted");
      setError(null);
      return;
    }
    setStatus(outcome.status);
    setError(MESSAGE[outcome.status]);
  }, []);

  const request = useCallback(() => {
    setStatus("requesting");
    setError(null);
    void locate().then(apply);
  }, [apply]);

  useEffect(() => {
    if (!immediate) return;
    let cancelled = false;
    // 권한 팝업 응답은 비동기라 effect 본문에서 상태를 바꾸지 않음
    // 팝업이 스플래시를 덮으면 그사이에도 덮개의 시간이 흘러 로고가 지나가 버려 걷힌 뒤에 물음
    void (async () => {
      if (await willPrompt()) await whenSplashGone();
      if (cancelled) return;
      const outcome = await locate();
      if (!cancelled) apply(outcome);
    })();
    return () => {
      cancelled = true;
    };
  }, [immediate, apply]);

  return { status, point, accuracyMeters, error, request };
}
