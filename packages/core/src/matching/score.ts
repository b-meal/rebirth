// 실종 신고와 목격 제보의 유사도. 개체 동일성을 확정하지 않음
// 배점은 화면 기획서 기준. 거리 35 · 시간 25 · 털색 20 · 크기 10 · 특징 10
// 외부 호출이 없어 서버와 클라이언트 양쪽에서 씀

import { distanceKm, type LatLng } from "../location/geo.ts";

export const WEIGHTS = {
  distance: 35,
  time: 25,
  color: 20,
  size: 10,
  features: 10,
} as const;

export const MAX_SCORE = 100;

// 이 거리를 넘으면 거리 점수가 0. 반경 밖 후보는 애초에 조회하지 않음
const DISTANCE_ZERO_KM = 15;
// 이 시간을 넘으면 시간 점수가 0
const TIME_ZERO_HOURS = 24 * 14;

export type MatchInput = {
  animalType: "dog" | "cat" | "other" | "unknown";
  colors: string[];
  size: "small" | "medium" | "large" | "unknown";
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  // 공개 격자 좌표. 정확 좌표를 쓰지 않아도 순위가 뒤집히지 않음
  point: LatLng | null;
  occurredAt: Date;
};

export type MatchBreakdown = {
  distance: number;
  time: number;
  color: number;
  size: number;
  features: number;
  reason: string;
};

export type MatchResult = {
  score: number;
  breakdown: MatchBreakdown;
  // 거리와 시간의 실제 값. 근거 문장을 화면에서 다시 만들 때 씀
  distanceKm: number | null;
  hoursApart: number;
};

const round = (value: number) => Math.round(value);

/** 가까울수록 높음. 선형이 아니라 초반 거리에 민감하게 함 */
function scoreDistance(lost: LatLng | null, sighting: LatLng | null) {
  if (!lost || !sighting) {
    // 한쪽이라도 좌표가 없으면 거리로 판단할 수 없음. 절반만 줌
    return { points: WEIGHTS.distance / 2, km: null };
  }
  const km = distanceKm(lost, sighting);
  if (km >= DISTANCE_ZERO_KM) return { points: 0, km };
  // 제곱근을 써서 1km 안쪽의 차이를 크게 벌림
  const ratio = 1 - Math.sqrt(km / DISTANCE_ZERO_KM);
  return { points: WEIGHTS.distance * ratio, km };
}

/**
 * 실종 시각 이후의 목격만 의미가 있음
 * 실종보다 앞선 목격은 같은 개체라도 단서가 되지 않아 0점
 */
function scoreTime(lostAt: Date, sightedAt: Date) {
  const hours = (sightedAt.getTime() - lostAt.getTime()) / 3_600_000;
  if (hours < 0) return { points: 0, hours };
  if (hours >= TIME_ZERO_HOURS) return { points: 0, hours };
  const ratio = 1 - hours / TIME_ZERO_HOURS;
  return { points: WEIGHTS.time * ratio, hours };
}

// 색 이름이 서로 포함 관계면 같은 것으로 봄. "흰색" 과 "흰색 얼룩"
function colorsOverlap(a: string, b: string) {
  const x = a.trim();
  const y = b.trim();
  return x === y || x.includes(y) || y.includes(x);
}

function scoreColor(lost: string[], sighting: string[]) {
  if (lost.length === 0 || sighting.length === 0) return WEIGHTS.color / 2;
  const matched = lost.filter((c) => sighting.some((s) => colorsOverlap(c, s)));
  // 신고한 색이 모두 목격에 있으면 만점
  return WEIGHTS.color * (matched.length / lost.length);
}

function scoreSize(lost: MatchInput["size"], sighting: MatchInput["size"]) {
  if (lost === "unknown" || sighting === "unknown") return WEIGHTS.size / 2;
  if (lost === sighting) return WEIGHTS.size;
  const order = ["small", "medium", "large"];
  const gap = Math.abs(order.indexOf(lost) - order.indexOf(sighting));
  // 한 단계 차이는 절반만 깎음. 소형과 중형은 사람이 자주 혼동함
  return gap === 1 ? WEIGHTS.size * 0.4 : 0;
}

/** 목줄과 부상, 귀 끝. 한쪽이 모르겠음이면 감점하지 않음 */
function scoreFeatures(lost: MatchInput, sighting: MatchInput) {
  const pairs: [boolean | null, boolean | null][] = [
    [lost.collar, sighting.collar],
    [lost.injury, sighting.injury],
    [lost.earTip, sighting.earTip],
  ];
  const known = pairs.filter(([a, b]) => a !== null && b !== null);
  if (known.length === 0) return WEIGHTS.features / 2;
  const agreed = known.filter(([a, b]) => a === b).length;
  return WEIGHTS.features * (agreed / known.length);
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function formatElapsed(hours: number): string {
  if (hours < 1) return "실종 직후";
  if (hours < 24) return `실종 ${Math.round(hours)}시간 뒤`;
  return `실종 ${Math.round(hours / 24)}일 뒤`;
}

const SIZE_LABEL: Record<MatchInput["size"], string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "크기 미확인",
};

/**
 * 점수의 근거를 사람 말로 풀어 씀
 * 화면이 점수 옆에 이 문장을 함께 보여줘 숫자만 읽히지 않게 함
 */
function buildReason(
  lost: MatchInput,
  sighting: MatchInput,
  km: number | null,
  hours: number,
): string {
  const parts: string[] = [];

  if (km !== null) parts.push(`마지막 위치에서 ${formatDistance(km)}`);
  else parts.push("위치 비교 불가");

  if (hours >= 0) parts.push(formatElapsed(hours));
  else parts.push("실종 신고보다 앞선 목격");

  const sharedColors = lost.colors.filter((c) =>
    sighting.colors.some((s) => colorsOverlap(c, s)),
  );
  const sameSize = lost.size !== "unknown" && lost.size === sighting.size;

  if (sharedColors.length > 0 && sameSize) {
    parts.push(`${sharedColors.join("·")} ${SIZE_LABEL[sighting.size]} 특징 일치`);
  } else if (sharedColors.length > 0) {
    parts.push(`${sharedColors.join("·")} 털색 일치`);
  } else if (sameSize) {
    parts.push(`${SIZE_LABEL[sighting.size]} 크기 일치`);
  }

  if (lost.collar === true && sighting.collar === true) parts.push("목줄 착용 일치");

  return parts.join(", ");
}

/** 종이 다르면 후보로 올리지 않음 */
export function isComparable(lost: MatchInput, sighting: MatchInput): boolean {
  if (lost.animalType === "unknown" || sighting.animalType === "unknown") return true;
  return lost.animalType === sighting.animalType;
}

export function scoreMatch(lost: MatchInput, sighting: MatchInput): MatchResult {
  const distance = scoreDistance(lost.point, sighting.point);
  const time = scoreTime(lost.occurredAt, sighting.occurredAt);
  const color = scoreColor(lost.colors, sighting.colors);
  const size = scoreSize(lost.size, sighting.size);
  const features = scoreFeatures(lost, sighting);

  const breakdown: MatchBreakdown = {
    distance: round(distance.points),
    time: round(time.points),
    color: round(color),
    size: round(size),
    features: round(features),
    reason: buildReason(lost, sighting, distance.km, time.hours),
  };

  const score =
    breakdown.distance +
    breakdown.time +
    breakdown.color +
    breakdown.size +
    breakdown.features;

  return {
    score: Math.min(MAX_SCORE, score),
    breakdown,
    distanceKm: distance.km,
    hoursApart: time.hours,
  };
}
