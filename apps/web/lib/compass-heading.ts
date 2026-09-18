// 자기 센서 이벤트를 북쪽 기준 시계 방향 각도로 바꾸는 순수 계산
// GPS 의 heading 은 이동 방향이라 서 있는 사람에게는 값이 없어 나침반과 구별해 다룸

export type HeadingSource = "absolute" | "webkit";

export type HeadingSample = {
  /** 북쪽 0, 시계 방향으로 커지는 각도, 0 이상 360 미만 */
  heading: number;
  source: HeadingSource;
};

// iOS 가 자기장 간섭으로 못 믿는 표본에 주는 값
// 오차 각도가 크다는 이유로는 버리지 않음, 보정 중에는 수십 도가 흔해 그러면 화살촉이 아예 안 뜸
const WEBKIT_UNRELIABLE = -1;

// Safari 만 붙이는 필드, 표준 타입에 없어 여기서만 넓힘
type OrientationLike = {
  alpha: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

export function normalizeDegrees(value: number): number {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * 절대 alpha 를 나침반 각도로 바꿈
 * alpha 는 기기 위쪽이 북쪽일 때 0 이고 반시계로 커져 방향을 뒤집음
 * 화면이 돌아가 있으면 기기 위쪽과 화면 위쪽이 달라 화면 각도를 더함
 */
export function toCompassHeading(alpha: number, screenAngle = 0): number {
  return normalizeDegrees(360 - alpha + screenAngle);
}

/** 이벤트에서 쓸 수 있는 방향만 골라냄. 북쪽을 모르는 상대 각도는 버림 */
export function readHeading(
  event: OrientationLike,
  screenAngle = 0,
): HeadingSample | null {
  const webkit = event.webkitCompassHeading;
  if (typeof webkit === "number" && Number.isFinite(webkit)) {
    if (event.webkitCompassAccuracy === WEBKIT_UNRELIABLE) return null;
    // 이미 시계 방향 북쪽 기준이라 뒤집지 않고 화면 각도만 더함
    return { heading: normalizeDegrees(webkit + screenAngle), source: "webkit" };
  }
  if (event.absolute !== true || event.alpha === null || !Number.isFinite(event.alpha)) {
    return null;
  }
  return { heading: toCompassHeading(event.alpha, screenAngle), source: "absolute" };
}

/** from 에서 to 로 가는 가장 짧은 회전량, -180 초과 180 이하 */
export function shortestDelta(from: number, to: number): number {
  const delta = normalizeDegrees(to - from);
  return delta > 180 ? delta - 360 : delta;
}
