// 카카오맵 JS SDK 로더. script 를 한 번만 넣고 autoload=false 로 받아 명시적으로 초기화

const SDK_ORIGIN = "https://dapi.kakao.com/v2/maps/sdk.js";
const SCRIPT_ID = "kakao-maps-sdk";

export type KakaoMapLibrary = "services" | "clusterer" | "drawing";

export type KakaoMapLoadErrorCode = "no-key" | "script-failed";

export class KakaoMapLoadError extends Error {
  readonly code: KakaoMapLoadErrorCode;

  constructor(code: KakaoMapLoadErrorCode, message: string) {
    super(message);
    this.name = "KakaoMapLoadError";
    this.code = code;
  }
}

/* SDK 타입. 실제로 호출하는 것만 선언해 @types 의존을 두지 않음 */

export type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
  equals(other: KakaoLatLng): boolean;
};

export type KakaoMapInstance = {
  getCenter(): KakaoLatLng;
  setCenter(position: KakaoLatLng): void;
  panTo(position: KakaoLatLng): void;
  getLevel(): number;
  setLevel(level: number, options?: { animate?: boolean }): void;
  setDraggable(draggable: boolean): void;
  relayout(): void;
};

export type KakaoMarkerInstance = {
  setPosition(position: KakaoLatLng): void;
  getPosition(): KakaoLatLng;
  setMap(map: KakaoMapInstance | null): void;
};

export type KakaoCircleInstance = {
  setPosition(position: KakaoLatLng): void;
  setRadius(radius: number): void;
  setMap(map: KakaoMapInstance | null): void;
};

type Listenable = KakaoMapInstance | KakaoMarkerInstance;

export type KakaoMapsNamespace = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level?: number; draggable?: boolean },
  ) => KakaoMapInstance;
  Marker: new (options: {
    position: KakaoLatLng;
    map?: KakaoMapInstance;
    draggable?: boolean;
    title?: string;
  }) => KakaoMarkerInstance;
  Circle: new (options: {
    center: KakaoLatLng;
    radius: number;
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: "solid" | "shortdash" | "dash" | "dot";
    fillColor?: string;
    fillOpacity?: number;
  }) => KakaoCircleInstance;
  event: {
    addListener(target: Listenable, type: string, handler: () => void): void;
    removeListener(target: Listenable, type: string, handler: () => void): void;
  };
};

declare global {
  interface Window {
    kakao?: { maps?: KakaoMapsNamespace };
  }
}

// ponytail: 라이브러리 조합은 첫 호출 기준으로 고정. 조합이 여러 개 필요해지면 조합별 캐시로 바꿈
let pending: Promise<KakaoMapsNamespace> | null = null;

// Next 밖의 번들러에는 process 전역이 없어 참조 자체가 터짐. 없으면 지도를 접는 쪽으로 흐름
function readKey(): string | undefined {
  try {
    return process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  } catch {
    return undefined;
  }
}

export function hasKakaoMapKey(): boolean {
  return Boolean(readKey());
}

export function loadKakaoMaps(
  libraries: KakaoMapLibrary[] = [],
): Promise<KakaoMapsNamespace> {
  if (pending) return pending;

  const key = readKey();
  if (!key) {
    // 키가 없으면 지도를 숨기고 검색으로 위치를 고르는 경로만 남김
    return Promise.reject(
      new KakaoMapLoadError("no-key", "NEXT_PUBLIC_KAKAO_JS_KEY 가 없습니다"),
    );
  }

  pending = new Promise<KakaoMapsNamespace>((resolve, reject) => {
    const ready = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(
          new KakaoMapLoadError("script-failed", "카카오맵 SDK 를 초기화하지 못했습니다"),
        );
        return;
      }
      maps.load(() => resolve(maps));
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps) ready();
      else existing.addEventListener("load", ready, { once: true });
      return;
    }

    const params = new URLSearchParams({ appkey: key, autoload: "false" });
    if (libraries.length > 0) params.set("libraries", libraries.join(","));

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `${SDK_ORIGIN}?${params.toString()}`;
    script.addEventListener("load", ready, { once: true });
    script.addEventListener(
      "error",
      () => {
        // 다음 시도에서 다시 붙일 수 있게 캐시와 태그를 비움
        pending = null;
        script.remove();
        reject(
          new KakaoMapLoadError(
            "script-failed",
            "카카오맵 SDK 를 불러오지 못했습니다. 도메인이 카카오 플랫폼에 등록됐는지 확인하십시오",
          ),
        );
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return pending;
}

export function describeKakaoMapError(error: unknown): string {
  if (error instanceof KakaoMapLoadError && error.code === "no-key") {
    return "지도를 쓸 수 없습니다. 장소를 검색해 위치를 골라 주십시오";
  }
  return "지도를 불러오지 못했습니다. 장소를 검색해 위치를 골라 주십시오";
}
