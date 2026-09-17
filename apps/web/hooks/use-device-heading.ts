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

// 나침반이 이 시간 안에 값을 주지 않으면 자력계가 없는 기기로 보고 위치 쪽으로 물러섬
const COMPASS_WAIT_MS = 3000;

// 걷기 시작으로 볼 속도와 멈춤으로 볼 속도, 둘을 벌려 경계에서 화살이 깜빡이지 않게 함
const MOVING_MPS = 0.7;
const STOPPED_MPS = 0.3;

/**
 * 손에 드는 기기인지. 데스크탑은 나침반이 없어 화살이 뜰 일이 없는데
 * 위치 감시만 계속 돌아 주소창에 위치 사용 표시가 남음
 */
function handheld(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

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

/**
 * 위치가 알려 주는 진행 방향. 나침반이 없는 기기에서 방향을 아는 길은 이것뿐
 * 서 있으면 방향이 없어 null, 걷는 중에만 값이 있음
 */
function readCourse(coords: GeolocationCoordinates, walking: boolean): number | null {
  const speed = coords.speed;
  if (typeof speed === "number" && Number.isFinite(speed)) {
    if (!(walking ? speed >= STOPPED_MPS : speed >= MOVING_MPS)) return null;
  }
  const course = coords.heading;
  // 멈춰 있을 때 iOS 는 음수, 안드로이드는 지난 값을 그대로 두기도 함
  if (typeof course !== "number" || !Number.isFinite(course) || course < 0) return null;
  return course % 360;
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

  // 허락을 받은 뒤 센서를 다시 붙이는 계기, iOS 는 허락 전에 건 것으로는 값이 오지 않음
  const [attempt, setAttempt] = useState(0);

  // 첫 렌더에서 한 번만 봄, 서버에서는 알 수 없어 켜지 않음
  const [active] = useState(handheld);
  const on = enabled && active;

  const request = useCallback(() => {
    if (!active) return;
    const api = permissionApi();
    if (!api?.requestPermission) return;
    void api
      .requestPermission()
      .then((state) => {
        if (state === "granted") setAttempt((count) => count + 1);
      })
      .catch(() => {});
  }, [active]);

  // 이미 허용해 둔 기기는 탭을 기다릴 이유가 없어 한 번 물어봄
  // 손가락이 닿지 않은 요청은 prompt 나 거절로 돌아오고 그때는 단추를 기다림
  useEffect(() => {
    if (!on) return;
    const api = permissionApi();
    if (!api?.requestPermission) return;
    let alive = true;
    void api
      .requestPermission()
      .then((state) => {
        if (alive && state === "granted") setAttempt((count) => count + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [on]);

  useEffect(() => {
    if (!on || typeof window === "undefined") return;

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

    const publish = (next: number | null) => {
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

    // 두 이벤트가 같이 오는 기기가 있어 먼저 쓸 만한 값을 준 쪽만 계속 씀
    let source: string | null = null;
    let watch = 0;
    let walking = false;

    // 자력계가 없으면 나침반 이벤트는 와도 값이 비어 있음, 그때만 위치 쪽을 켬
    const stopWatch = () => {
      if (!watch) return;
      navigator.geolocation.clearWatch(watch);
      watch = 0;
      walking = false;
    };

    const startWatch = () => {
      if (watch || typeof navigator === "undefined" || !navigator.geolocation) return;
      watch = navigator.geolocation.watchPosition(
        ({ coords }) => {
          // 나침반이 뒤늦게 살아나면 그쪽이 바라보는 방향을 알아 더 정확함
          if (source !== null) {
            stopWatch();
            return;
          }
          const course = readCourse(coords, walking);
          walking = course !== null;
          publish(course);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000 },
      );
    };

    const fallback = window.setTimeout(startWatch, COMPASS_WAIT_MS);

    // 센서는 초당 수십 번 올라와 한 프레임에 한 번만 반영함
    const handle = (event: Event) => {
      if (source !== null && event.type !== source) return;
      const next = readHeading(event as CompassEvent);
      if (next === null) {
        if (source === null) return;
        publish(null);
        return;
      }
      source ??= event.type;
      window.clearTimeout(fallback);
      stopWatch();
      publish(next);
    };

    // 어느 쪽이 값을 주는지는 기기가 정함, 안드로이드는 절대 방향 쪽, Safari 는 기본 쪽
    const types = ["deviceorientationabsolute", "deviceorientation"] as const;
    for (const type of types) window.addEventListener(type, handle);
    return () => {
      for (const type of types) window.removeEventListener(type, handle);
      window.clearTimeout(fallback);
      stopWatch();
      if (frame) cancelAnimationFrame(frame);
      latest.current(null);
    };
  }, [on, attempt]);

  return { request };
}
