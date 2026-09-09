"use client";

import type { LatLng } from "@rebirth/core/location/geo";
import { useCallback, useEffect, useState } from "react";

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

// AI 분석 상한과 같은 8초. 넘으면 직접 입력으로 돌림
const TIMEOUT_MS = 8000;

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

function locate(): Promise<Outcome> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, status: "unavailable" });
  }
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
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 30_000 },
    );
  });
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
    void locate().then((outcome) => {
      if (!cancelled) apply(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [immediate, apply]);

  return { status, point, accuracyMeters, error, request };
}
