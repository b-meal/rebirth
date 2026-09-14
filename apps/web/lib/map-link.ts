// 지도 앱으로 길찾기를 넘기는 주소
// 출발지는 넣지 않음. 두 앱 모두 비워 두면 기기가 잡은 현재 위치에서 출발함

export type MapProvider = "naver" | "kakao";

export type Directions = {
  /** 격자로 넓힌 공개용 좌표. 정확한 목격 지점이 아님 */
  lat: number;
  lng: number;
  /** 지도 앱에 뜰 도착지 이름 */
  name: string;
};

/** 고르는 줄에 세우는 차례 */
export const MAP_PROVIDERS: MapProvider[] = ["naver", "kakao"];

export const PROVIDER_LABEL: Record<MapProvider, string> = {
  naver: "네이버 지도",
  kakao: "카카오맵",
};

/** 앱이 열리지 않으면 대신 여는 웹 지도 */
export function webDirectionsUrl(provider: MapProvider, to: Directions): string {
  const name = encodeURIComponent(to.name);
  if (provider === "kakao") {
    return `https://map.kakao.com/link/to/${name},${to.lat},${to.lng}`;
  }
  // 출발지 자리의 - 가 현재 위치를 뜻함
  return `https://map.naver.com/p/directions/-/${to.lng},${to.lat},${name}/-/walk`;
}

/**
 * 설치돼 있으면 앱을 여는 주소
 * 네이버는 appname 이 없으면 열리지 않아 부르는 쪽 호스트를 그대로 넘김
 */
export function appDirectionsUrl(
  provider: MapProvider,
  to: Directions,
  appName: string,
): string {
  const name = encodeURIComponent(to.name);
  if (provider === "kakao") {
    return `kakaomap://route?ep=${to.lat},${to.lng}&by=FOOT`;
  }
  return `nmap://route/walk?dlat=${to.lat}&dlng=${to.lng}&dname=${name}&appname=${encodeURIComponent(appName)}`;
}

// 앱이 뜨기를 기다리는 시간. 넘기면 설치돼 있지 않다고 보고 웹으로 감
const APP_WAIT_MS = 1200;

/**
 * 마우스를 쓰는 기기에는 지도 앱이 없어 곧장 웹으로 감
 * 스킴을 던져 봐야 브라우저가 오류 창만 띄움
 */
function prefersWeb(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function openDirections(provider: MapProvider, to: Directions): void {
  const web = webDirectionsUrl(provider, to);
  if (prefersWeb()) {
    window.open(web, "_blank", "noopener");
    return;
  }

  const app = appDirectionsUrl(provider, to, window.location.hostname);

  // 앱이 열리면 이 문서가 뒤로 숨으므로 그때는 웹을 열지 않음
  const timer = window.setTimeout(() => {
    if (document.visibilityState === "hidden") return;
    window.location.href = web;
  }, APP_WAIT_MS);

  window.addEventListener("pagehide", () => window.clearTimeout(timer), { once: true });
  window.location.href = app;
}
