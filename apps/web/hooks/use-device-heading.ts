"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 기기가 바라보는 쪽을 북쪽 기준 시계 방향 각도로 알려 주는 자리
// 값이 자주 바뀌어 상태로 들고 있으면 화면 전체가 다시 그려짐, 바뀔 때마다 부르는 쪽에 넘김

type CompassEvent = DeviceOrientationEvent & {
  /** Safari 만 주는 값, 진북 기준 시계 방향이라 그대로 씀 */
  webkitCompassHeading?: number;
  /** Safari 가 말하는 오차 각도, 보정 전에는 음수 */
  webkitCompassAccuracy?: number;
};

type PermissionApi = {
  requestPermission?: () => Promise<PermissionState | "granted" | "denied">;
};

// 새 값을 섞는 비율, 자력계가 떨려도 화살이 같이 떨지 않게 함
const SMOOTHING = 0.2;

// 이만큼 움직이지 않으면 알리지 않음, 1도 단위로 알리면 한 프레임에 여러 번 그림
const MIN_DEGREES = 1.5;

// Safari 가 이보다 큰 오차를 말하면 방향을 감춤, 보정 전이거나 자석이 흔들리는 상태
const MAX_ACCURACY_DEGREES = 50;

/** iOS 는 손가락이 닿은 순간에만 물어볼 수 있어 켜는 시점을 부르는 쪽이 정함 */
function permissionApi(): PermissionApi | null {
  if (typeof DeviceOrientationEvent === "undefined") return null;
  const api = DeviceOrientationEvent as unknown as PermissionApi;
  return typeof api.requestPermission === "function" ? api : null;
}

/** 나침반 값을 못 믿을 상태면 null, 부르는 쪽은 화살을 감춤 */
function readHeading(event: CompassEvent): number | null {
  const accuracy = event.webkitCompassAccuracy;
  if (typeof accuracy === "number" && (accuracy < 0 || accuracy > MAX_ACCURACY_DEGREES)) {
    return null;
  }
  const compass = event.webkitCompassHeading;
  if (typeof compass === "number" && Number.isFinite(compass)) return compass;
  // 표준 alpha 는 북쪽에서 반시계로 재 방향이 반대
  if (event.absolute !== true || typeof event.alpha !== "number") return null;
  return (360 - event.alpha) % 360;
}

/** 두 각도의 짧은 쪽 차이, 359도와 1도가 358도 차이로 읽히지 않게 함 */
function difference(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export type DeviceHeadingOptions = {
  /** 내 위치 표시가 지도에 올라와 있을 때만 센서를 켬 */
  enabled: boolean;
  /** 방향이 바뀔 때마다 부름, 못 읽는 상태가 되면 null */
  onChange: (heading: number | null) => void;
};

export type DeviceHeadingState = {
  /** iOS 권한 창을 여는 자리, 반드시 탭 처리 안에서 부름 */
  request: () => void;
};

export function useDeviceHeading({ enabled, onChange }: DeviceHeadingOptions): DeviceHeadingState {
  // 콜백이 바뀔 때마다 센서를 다시 붙이지 않도록 최신 것만 갈아 끼움
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  // 물어볼 것이 없는 브라우저는 곧바로 듣기 시작함
  const [granted, setGranted] = useState(
    () => typeof window !== "undefined" && permissionApi() === null,
  );

  const request = useCallback(() => {
    const api = permissionApi();
    if (!api?.requestPermission) return;
    void api
      .requestPermission()
      .then((state) => setGranted(state === "granted"))
      .catch(() => {});
  }, []);

  // 이미 허용해 둔 기기는 탭을 기다릴 이유가 없어 한 번 물어봄
  // 손가락이 닿지 않은 요청은 prompt 나 거절로 돌아오고 그때는 단추를 기다림
  useEffect(() => {
    if (!enabled || granted) return;
    const api = permissionApi();
    if (!api?.requestPermission) return;
    let alive = true;
    void api
      .requestPermission()
      .then((state) => {
        if (alive && state === "granted") setGranted(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled, granted]);

  useEffect(() => {
    if (!enabled || !granted || typeof window === "undefined") return;

    // 절대 방향을 주는 쪽이 있으면 그것을 듣고, 없으면 Safari 가 쓰는 쪽을 들음
    const type = "ondeviceorientationabsolute" in window
      ? "deviceorientationabsolute"
      : "deviceorientation";

    let frame = 0;
    let pending: number | null = null;
    let smoothed: number | null = null;
    let sent: number | null = null;

    const flush = () => {
      frame = 0;
      if (pending === null) return;
      smoothed =
        smoothed === null ? pending : (smoothed + difference(smoothed, pending) * SMOOTHING + 360) % 360;
      if (sent !== null && Math.abs(difference(sent, smoothed)) < MIN_DEGREES) return;
      sent = smoothed;
      latest.current(smoothed);
    };

    // 센서는 초당 수십 번 올라와 한 프레임에 한 번만 반영함
    const handle = (event: Event) => {
      const next = readHeading(event as CompassEvent);
      if (next === null) {
        pending = null;
        smoothed = null;
        if (sent !== null) {
          sent = null;
          latest.current(null);
        }
        return;
      }
      pending = next;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    window.addEventListener(type, handle);
    return () => {
      window.removeEventListener(type, handle);
      if (frame) cancelAnimationFrame(frame);
      latest.current(null);
    };
  }, [enabled, granted]);

  return { request };
}
