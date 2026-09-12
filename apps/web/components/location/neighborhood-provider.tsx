"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";

// 내 동네 이름 하나를 앱 전체가 나눠 씀
// 훅을 화면마다 부르면 위치 권한 팝업이 매번 떠 한 곳에서만 물음
// 이름은 문구에만 쓰고 저장하지 않음. 좌표는 행정동을 받는 순간에만 서버를 거침

export type NeighborhoodState = {
  /** 예: 양재2동. 아직 모르면 null */
  areaName: string | null;
  /** 권한을 주지 않아 동네를 모르는 상태인지. 다시 켤 버튼을 띄우는 조건 */
  blocked: boolean;
  /** 동네 이름이 필요한 화면에서 부름. 부르기 전에는 위치를 묻지 않음 */
  ensure: () => void;
  /** 거부한 뒤 다시 물음. 브라우저가 이미 막았으면 설정에서 켜야 함 */
  retry: () => void;
};

const NeighborhoodContext = createContext<NeighborhoodState | null>(null);

export function NeighborhoodProvider({ children }: { children: ReactNode }) {
  // 동네 이름을 쓰는 화면에 들어가야 위치를 물음
  const [wanted, setWanted] = useState(false);

  const position = useCurrentPosition({ immediate: wanted });
  // 지도처럼 좌표가 계속 바뀌지 않고 한 번만 잡으면 되므로 기다리지 않음
  const geocode = useReverseGeocode(position.point, { debounceMs: 0 });

  const ensure = useCallback(() => setWanted(true), []);

  // position 객체는 매 렌더 새 참조라 request 함수만 꺼내 씀
  const { request } = position;
  const retry = useCallback(() => {
    setWanted(true);
    request();
  }, [request]);

  const value = useMemo<NeighborhoodState>(() => {
    const failed =
      position.status === "denied" ||
      position.status === "timeout" ||
      position.status === "unavailable" ||
      geocode.error !== null;

    return {
      areaName: geocode.result?.areaName ?? null,
      blocked: failed,
      ensure,
      retry,
    };
  }, [position.status, geocode.result, geocode.error, ensure, retry]);

  return (
    <NeighborhoodContext.Provider value={value}>{children}</NeighborhoodContext.Provider>
  );
}

export function useNeighborhood(): NeighborhoodState {
  const value = useContext(NeighborhoodContext);
  if (!value) {
    throw new Error("useNeighborhood 는 NeighborhoodProvider 안에서만 쓸 수 있음");
  }
  return value;
}
