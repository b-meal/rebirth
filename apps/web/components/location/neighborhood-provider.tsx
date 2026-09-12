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
  /** 위치를 확인하는 중인지. 첫 진입에서 문구가 깜빡이지 않도록 씀 */
  loading: boolean;
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
  const geocode = useReverseGeocode(position.point);

  const ensure = useCallback(() => setWanted(true), []);

  const retry = useCallback(() => {
    setWanted(true);
    position.request();
  }, [position]);

  const value = useMemo<NeighborhoodState>(() => {
    const failed =
      position.status === "denied" ||
      position.status === "timeout" ||
      position.status === "unavailable" ||
      geocode.error !== null;

    return {
      areaName: geocode.result?.areaName ?? null,
      loading: position.status === "requesting" || geocode.loading,
      blocked: failed,
      ensure,
      retry,
    };
  }, [position.status, geocode.result, geocode.loading, geocode.error, ensure, retry]);

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
