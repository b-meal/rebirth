"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readHeading } from "@/lib/compass-heading";

// 기기 자기 센서 구독. 각도는 초당 수십 번 와서 React 상태가 아니라 구독 채널로 흘림
// 상태로 두는 것은 권한과 지원 여부처럼 드물게 바뀌는 단계만

export type DeviceHeadingStatus =
  | "idle"
  // 센서 이벤트가 없는 브라우저, 데스크톱이 대부분
  | "unsupported"
  // iOS 는 사용자가 누른 안에서만 권한을 물을 수 있어 그 탭을 기다림
  | "needs-gesture"
  | "denied"
  | "active"
  // 이벤트는 있지만 북쪽을 모르는 값만 와서 쓸 수 없음
  | "unavailable";

export type DeviceHeadingState = {
  status: DeviceHeadingStatus;
  /** 사용자가 누른 안에서 부름. iOS 권한 팝업이 여기서 뜸 */
  enable: () => void;
  /** 각도가 올 때마다 부름, 돌려받은 함수로 해제 */
  subscribe: (listener: (heading: number) => void) => () => void;
};

// 이 시간 안에 쓸 수 있는 표본이 없으면 센서가 없는 기기로 봄
const FIRST_SAMPLE_TIMEOUT_MS = 3000;

// Safari 는 granted 와 denied 만 주고, Chromium 은 누르지 않고 부르면 prompt 를 돌려줌
// absolute 인자는 자기 센서까지 함께 묻는 표시, Safari 는 인자를 무시함
type PermissionRequest = (absolute?: boolean) => Promise<"granted" | "denied" | "prompt">;

// 표준 타입에 없는 Safari 의 정적 메서드
function permissionRequest(): PermissionRequest | null {
  if (typeof DeviceOrientationEvent === "undefined") return null;
  const request = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest })
    .requestPermission;
  return typeof request === "function" ? request.bind(DeviceOrientationEvent) : null;
}

function supported(): boolean {
  return typeof window !== "undefined" && typeof DeviceOrientationEvent !== "undefined";
}

// Android 는 절대 각도 이벤트를 따로 내고 iOS 는 일반 이벤트에 나침반 필드를 붙임
function eventName(): "deviceorientationabsolute" | "deviceorientation" {
  return "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
}

function screenAngle(): number {
  return typeof screen !== "undefined" ? (screen.orientation?.angle ?? 0) : 0;
}

export function useDeviceHeading(): DeviceHeadingState {
  // 지원 여부는 렌더 전에 알 수 있어 effect 에서 상태를 바꾸지 않고 처음부터 정함
  const [status, setStatus] = useState<DeviceHeadingStatus>(() =>
    supported() ? "idle" : "unsupported",
  );
  const listeners = useRef(new Set<(heading: number) => void>());
  // 구독 해제 함수, 화면을 벗어나면 센서를 끄고 돌아오면 다시 켬
  const detach = useRef<(() => void) | null>(null);

  // onSilence 는 기다려도 표본이 없을 때 갈 상태. 권한을 아직 못 물었으면 탭을 기다리고, 물었으면 없는 기기
  const listen = useCallback((onSilence: DeviceHeadingStatus) => {
    if (detach.current) return;
    const name = eventName();
    let received = false;
    const timer = setTimeout(() => {
      if (received) return;
      detach.current?.();
      setStatus(onSilence);
    }, FIRST_SAMPLE_TIMEOUT_MS);

    const handle = (event: DeviceOrientationEvent) => {
      const sample = readHeading(event, screenAngle());
      if (!sample) return;
      if (!received) {
        received = true;
        clearTimeout(timer);
        setStatus("active");
      }
      for (const listener of listeners.current) listener(sample.heading);
    };
    window.addEventListener(name, handle as EventListener);
    detach.current = () => {
      clearTimeout(timer);
      window.removeEventListener(name, handle as EventListener);
      detach.current = null;
    };
  }, []);

  // silent 는 누르지 않고 미리 해 보는 시도
  // 권한 API 가 없거나 답이 미정이면 먼저 귀를 열어 봄, 권한 없이도 이벤트를 주는 브라우저가 많음
  // 그래도 표본이 없을 때만 탭을 기다리고, 누른 뒤에 물어서 거절당한 것만 denied 로 둠
  const start = useCallback(
    (silent: boolean) => {
      if (!supported()) return;
      const request = permissionRequest();
      if (!request) {
        listen("unavailable");
        return;
      }
      request(true)
        .then((answer) => {
          if (answer === "granted") listen("unavailable");
          else if (answer === "denied" && !silent) setStatus("denied");
          else listen(silent ? "needs-gesture" : "unavailable");
        })
        .catch(() => {
          // Safari 는 누른 안에서 부르지 않으면 거절로 던짐, 아직 못 물은 것이라 귀만 열어 둠
          listen(silent ? "needs-gesture" : "denied");
        });
    },
    [listen],
  );

  const enable = useCallback(() => start(false), [start]);

  // 권한이 필요 없는 기기는 곧바로 켜고, iOS 는 이미 허용한 세션이면 팝업 없이 켜짐
  const unsupported = status === "unsupported";
  useEffect(() => {
    if (unsupported) return;
    start(true);
  }, [unsupported, start]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") detach.current?.();
      else if (status === "active") listen("unavailable");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, listen]);

  useEffect(() => () => detach.current?.(), []);

  const subscribe = useCallback((listener: (heading: number) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return { status, enable, subscribe };
}
