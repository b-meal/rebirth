"use client";

import { useEffect, useState } from "react";

// 촬영 버튼을 내놓을지 정함
// 화면 폭이 아니라 장치 목록으로 판단함. 큰 화면 노트북도 촬영할 수 있음

async function detectCamera(): Promise<boolean> {
  const media = navigator.mediaDevices;
  if (!media?.enumerateDevices) {
    // 장치를 조회할 수 없으면 좁은 화면에서만 촬영으로 봄
    return window.matchMedia("(max-width: 1023px)").matches;
  }
  try {
    const devices = await media.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch {
    return false;
  }
}

/** 서버는 장치 목록을 몰라 null 로 시작하고 마운트 뒤에만 확정함 */
export function useCameraAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void detectCamera().then((next) => {
      if (alive) setAvailable(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return available;
}
