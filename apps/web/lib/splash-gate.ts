// 스플래시가 덮고 있는 동안 브라우저 권한 팝업을 미루는 신호
// iOS 는 팝업을 띄우며 화면을 어둡게 덮고 그 사이에도 덮개의 시간은 흘러 로고가 지나가 버림
// 덮개는 사용자가 단추를 눌러야 걷히므로 권한 요청도 그 손짓 뒤에만 일어남
// 시간이 지나면 저절로 풀리는 상한을 두지 않음. 손짓 없이 뜬 권한 팝업은 브라우저가 나쁜 관행으로 잡음

// 덮개가 뜨는 화면에서만 잠금. 공유 링크로 들어온 상세는 기다릴 덮개가 없음
let gone = true;
const waiting = new Set<() => void>();

/** 덮개가 마운트될 때 한 번 호출. 뒤따르는 effect 의 위치 요청이 덮개를 기다림 */
export function armSplashGate(): void {
  if (typeof window === "undefined") return;
  gone = false;
}

/** 덮개가 사라지거나 내려갈 때 호출. 이후의 대기는 곧바로 풀림 */
export function releaseSplashGate(): void {
  if (gone) return;
  gone = true;
  for (const resolve of waiting) resolve();
  waiting.clear();
}

/** 덮개가 걷힐 때까지 기다림. 덮개가 없으면 기다리지 않음 */
export function whenSplashGone(): Promise<void> {
  if (gone) return Promise.resolve();
  return new Promise((resolve) => {
    waiting.add(resolve);
  });
}
