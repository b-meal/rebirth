// 로그인 세션의 유휴 만료 판정
// Supabase 무료 플랜은 세션 만료 설정이 잠겨 있어 앱에서 직접 끊음
// server-only 를 import 하지 않음. 순수 판정이라 단위 테스트에서 그대로 돎

/**
 * 마지막 활동에서 이만큼 지나면 다시 로그인
 * 익명 관리 세션(7일)보다 길게 둠. 계정으로 되돌릴 수 있어 재로그인 부담이 작음
 */
export const IDLE_LIMIT_DAYS = 30;

const IDLE_LIMIT_MS = IDLE_LIMIT_DAYS * 24 * 3_600_000;

/** 마지막 활동 시각을 담는 쿠키. 값은 epoch 밀리초 */
export const LAST_SEEN_COOKIE = "rebirth_seen";

/**
 * 쿠키 수명. 유휴 한도보다 넉넉히 둬 브라우저가 먼저 지우지 않게 함
 * 쿠키가 사라지면 판정 근거가 없어 통과시키므로 한도보다 짧으면 만료가 무력해짐
 */
export const LAST_SEEN_MAX_AGE_SECONDS = (IDLE_LIMIT_DAYS + 7) * 24 * 3600;

/** 쿠키 값이 숫자가 아니거나 미래면 신뢰하지 않음 */
function parseSeenAt(raw: string | undefined, now: number): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) return undefined;
  // 기기 시계가 앞서 있거나 값이 조작된 경우. 지금 본 것으로 취급해 로그아웃시키지 않음
  if (value > now) return now;
  return value;
}

/**
 * 유휴 한도를 넘겼는지
 * 쿠키가 없으면 넘기지 않은 것으로 봄. 값을 위조해도 Supabase 세션이 따로 검증되므로
 * 이 판정만으로 남의 세션을 얻지는 못함
 */
export function isIdleExpired(
  raw: string | undefined,
  now: number = Date.now(),
): boolean {
  const seenAt = parseSeenAt(raw, now);
  if (seenAt === undefined) return false;
  return now - seenAt > IDLE_LIMIT_MS;
}

/**
 * 쿠키를 다시 써야 하는지
 * 요청마다 쓰면 Set-Cookie 가 매번 붙어 응답이 커지고 캐시를 방해함
 * 하루 단위로만 갱신해도 30일 판정에는 영향이 없음
 */
const REFRESH_AFTER_MS = 24 * 3_600_000;

export function shouldRefreshSeenAt(
  raw: string | undefined,
  now: number = Date.now(),
): boolean {
  const seenAt = parseSeenAt(raw, now);
  if (seenAt === undefined) return true;
  return now - seenAt > REFRESH_AFTER_MS;
}
