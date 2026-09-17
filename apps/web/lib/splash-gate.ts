// 스플래시가 덮고 있는 동안 브라우저 권한 팝업을 미루는 신호
// iOS 는 팝업을 띄우며 화면을 어둡게 덮고 그 사이에도 덮개의 시간은 흘러 로고가 지나가 버림

// 덮개가 끝나지 않는 화면에서 잠금이 남지 않도록 두는 상한
const MAX_WAIT_MS = 4000;

// 서버에는 덮개가 없어 처음부터 걷힌 상태로 둠
let gone = typeof window === "undefined";
const waiting = new Set<() => void>();

/** 덮개가 사라진 순간 호출. 이후의 대기는 곧바로 풀림 */
export function releaseSplashGate(): void {
  if (gone) return;
  gone = true;
  for (const resolve of waiting) resolve();
  waiting.clear();
}

/** 덮개가 걷힐 때까지 기다림. 첫 진입이 아니면 기다리지 않음 */
export function whenSplashGone(): Promise<void> {
  if (gone) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiting.delete(done);
      resolve();
    }, MAX_WAIT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    waiting.add(done);
  });
}
