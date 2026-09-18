"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// 묶음 입구는 kakao-local 을 함께 내보내고 그 파일이 server-only 라 클라이언트에서 막힘
// 쿠키 상수만 쓰므로 파일을 곧장 가리킴
import { AREA_COOKIE, AREA_COOKIE_MAX_AGE } from "@rebirth/core/location/area-cookie";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";

// 내 동네 이름 하나를 앱 전체가 나눠 씀
// 훅을 화면마다 부르면 위치 권한 팝업이 매번 떠 한 곳에서만 물음
// 이름은 문구에만 쓰고 저장하지 않음. 좌표는 행정동을 받는 순간에만 서버를 거침

export type NeighborhoodState = {
  /** 예: 양재2동. 아직 모르면 null */
  areaName: string | null;
  /** 동네를 알아내는 중. 처음 물을 때와 다시 잡을 때를 모두 덮음 */
  loading: boolean;
  /** 권한을 주지 않아 동네를 모르는 상태인지. 다시 켤 버튼을 띄우는 조건 */
  blocked: boolean;
  /** 동네 이름이 필요한 화면에서 부름. 부르기 전에는 위치를 묻지 않음 */
  ensure: () => void;
  /** 거부한 뒤 다시 물음. 브라우저가 이미 막았으면 설정에서 켜야 함 */
  retry: () => void;
};

const NeighborhoodContext = createContext<NeighborhoodState | null>(null);

/**
 * 알아낸 동네를 쿠키에 적어 둠
 * 위치는 브라우저만 알아 서버가 첫 화면을 그릴 때는 동네를 모름
 * 그래서 전국 목록을 그렸다가 동네를 잡은 뒤 다시 읽어 목록과 글자가 한 번 바뀜
 * 다음 진입부터는 서버가 이 값을 읽어 처음부터 내 동네 목록을 그림
 */
function remember(areaName: string): void {
  try {
    document.cookie = `${AREA_COOKIE}=${encodeURIComponent(areaName)}; path=/; max-age=${AREA_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // 쿠키를 막아 둔 환경에서는 예전처럼 화면에서 다시 읽음
  }
}

/**
 * 다시 잡기를 누른 뒤 표시를 최소한 이만큼은 둠
 * 좌표가 그대로면 캐시로 즉시 끝나 표시가 한 프레임 스쳐 눌린 티가 나지 않음
 */
const MIN_SPIN_MS = 400;

export function NeighborhoodProvider({ children }: { children: ReactNode }) {
  // 동네 이름을 쓰는 화면에 들어가야 위치를 물음
  const [wanted, setWanted] = useState(false);
  // 눌러서 다시 잡는 중인지. 결과가 앞과 같아도 눌렀다는 것은 보여야 함
  const [spinning, setSpinning] = useState(false);
  const spinStartedAt = useRef(0);

  const position = useCurrentPosition({ immediate: wanted });
  // 지도처럼 좌표가 계속 바뀌지 않고 한 번만 잡으면 되므로 기다리지 않음
  const geocode = useReverseGeocode(position.point, { debounceMs: 0 });

  const ensure = useCallback(() => setWanted(true), []);

  // position 객체는 매 렌더 새 참조라 request 함수만 꺼내 씀
  const { request } = position;
  const retry = useCallback(() => {
    setWanted(true);
    spinStartedAt.current = Date.now();
    setSpinning(true);
    request();
  }, [request]);

  // 측위와 행정동 조회가 모두 끝나면 표시를 끔
  // 좌표가 앞과 같으면 행정동 조회는 아예 다시 돌지 않아 측위만으로 끝남
  useEffect(() => {
    if (!spinning) return;
    if (position.status === "requesting" || geocode.loading) return;
    const left = MIN_SPIN_MS - (Date.now() - spinStartedAt.current);
    if (left <= 0) {
      setSpinning(false);
      return;
    }
    const timer = setTimeout(() => setSpinning(false), left);
    return () => clearTimeout(timer);
  }, [spinning, position.status, geocode.loading]);

  // 동네를 알아내면 적어 둠. 다음 진입부터 서버가 처음부터 내 동네 목록을 그림
  const found = geocode.result?.areaName ?? null;
  useEffect(() => {
    if (found) remember(found);
  }, [found]);

  const value = useMemo<NeighborhoodState>(() => {
    const failed =
      position.status === "denied" ||
      position.status === "timeout" ||
      position.status === "unavailable" ||
      geocode.error !== null;

    // 훅의 status 는 첫 렌더의 immediate 로 정해져 나중에 켜도 idle 로 남음
    // 그래서 상태 이름 대신 결과나 실패가 도착했는지로 판단함
    const settled = failed || geocode.result !== null;

    return {
      areaName: geocode.result?.areaName ?? null,
      // 세 갈래를 합침. 앞의 결과가 남아 있어 settled 가 참인 채로 다시 잡는 동안에도 켜져야 함
      // geocode.loading 을 같이 보는 것은 측위가 끝나고 행정동을 받는 사이가 비지 않게 하려는 것
      loading: spinning || geocode.loading || (wanted && !settled),
      blocked: failed,
      ensure,
      retry,
    };
  }, [
    wanted,
    spinning,
    position.status,
    geocode.result,
    geocode.error,
    geocode.loading,
    ensure,
    retry,
  ]);

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
