// 목격 제보를 이은 이동 경로와 다음 목격 예측, 공개 격자 좌표만 쓰는 순수 계산

import { distanceKm, type LatLng } from "../location/geo.ts";

export type TrackSize = "small" | "medium" | "large" | "unknown";

// 체급별로 하루 내내 이어 낼 수 있는 이동 속도 상한 추정
export const V_MAX_KMH: Record<TrackSize, number> = {
  small: 3.0,
  medium: 4.5,
  large: 6.0,
  unknown: 4.5,
};

// 예측 반경의 시간당 확산 계수
export const SIGMA_KM: Record<TrackSize, number> = {
  small: 0.28,
  medium: 0.38,
  large: 0.5,
  unknown: 0.38,
};

export const R_MIN_KM = 0.4;
export const R_MAX_KM = 8;

// 격자 좌표의 위치 오차 하한, 반경이 0 으로 수렴하는 것 방지
export const GPS_EPSILON_KM = 0.3;

export const MIN_LEG_SCORE = 45;
export const MIN_TRACK_NODES = 2;
export const MAX_TRACK_NODES = 12;

const RAD = Math.PI / 180;
const KM_PER_LAT_DEGREE = 111.32;

export type TrackNode = {
  id: string;
  point: LatLng;
  occurredAt: Date;
  score: number;
  areaName: string | null;
};

export type TrackLeg = {
  from: TrackNode;
  to: TrackNode;
  km: number;
  hours: number;
  feasibility: number;
};

export type Track = {
  nodes: TrackNode[];
  legs: TrackLeg[];
  confidence: number;
};

export type Prediction = {
  center: LatLng;
  radiusKm: number;
  straightness: number;
  hoursSinceLast: number;
  bearingDeg: number;
};

const hoursBetween = (from: TrackNode, to: TrackNode) =>
  (to.occurredAt.getTime() - from.occurredAt.getTime()) / 3_600_000;

/** T1. 두 목격 사이를 체급 상한 속도로 걸어갈 수 있는지의 비율. 1 이하면 가능 */
export function legFeasibility(
  from: TrackNode,
  to: TrackNode,
  size: TrackSize,
): number {
  const hours = hoursBetween(from, to);
  // 같은 시각이나 역순인 두 목격은 이동으로 설명 불가
  if (hours <= 0) return Infinity;
  return distanceKm(from.point, to.point) / (V_MAX_KMH[size] * hours);
}

export function isFeasibleLeg(
  from: TrackNode,
  to: TrackNode,
  size: TrackSize,
): boolean {
  return legFeasibility(from, to, size) <= 1;
}

/** T2. 점수 미달과 이동 불가 노드를 걸러 시간순 경로 하나로 만듦 */
export function buildTrack({
  nodes,
  size,
}: {
  nodes: TrackNode[];
  size: TrackSize;
}): Track | null {
  const sorted = nodes
    .filter((node) => node.score >= MIN_LEG_SCORE)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const chain: TrackNode[] = [];
  for (const node of sorted) {
    const prev = chain.at(-1);
    if (!prev || isFeasibleLeg(prev, node, size)) chain.push(node);
  }
  if (chain.length < MIN_TRACK_NODES) return null;

  // 예측에 덜 쓰이는 오래된 쪽을 버려 경로 길이 제한
  const kept = chain.slice(-MAX_TRACK_NODES);

  const legs: TrackLeg[] = [];
  for (let i = 1; i < kept.length; i += 1) {
    const from = kept[i - 1]!;
    const to = kept[i]!;
    legs.push({
      from,
      to,
      km: distanceKm(from.point, to.point),
      hours: hoursBetween(from, to),
      feasibility: legFeasibility(from, to, size),
    });
  }

  const minScore = Math.min(...kept.map((node) => node.score));
  const meanFeasibility =
    legs.reduce((sum, leg) => sum + leg.feasibility, 0) / legs.length;

  return {
    nodes: kept,
    legs,
    confidence: Math.round(minScore * (1 - meanFeasibility)),
  };
}

// 위경도 차이를 평면 벡터로 바꾸되 경도는 위도별 실거리 축소 보정 대상
function legVector(leg: TrackLeg) {
  const midLat = (leg.from.point.lat + leg.to.point.lat) / 2;
  return {
    x: (leg.to.point.lng - leg.from.point.lng) * Math.cos(midLat * RAD),
    y: leg.to.point.lat - leg.from.point.lat,
  };
}

/** T3. 합벡터 길이를 이동 거리 합으로 나눈 방향 일관성. 1 이면 한 방향 직선 */
export function straightness(legs: TrackLeg[]): number {
  if (legs.length === 0) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumLen = 0;
  for (const leg of legs) {
    const v = legVector(leg);
    sumX += v.x;
    sumY += v.y;
    sumLen += Math.hypot(v.x, v.y);
  }
  if (sumLen === 0) return 0;
  return Math.min(1, Math.max(0, Math.hypot(sumX, sumY) / sumLen));
}

/** T4. 마지막 목격 이후 경과 시간만큼 마지막 이동 방향으로 옮긴 탐색 원 */
export function predictNext({
  track,
  size,
  now,
}: {
  track: Track;
  size: TrackSize;
  now: Date;
}): Prediction | null {
  const lastNode = track.nodes.at(-1);
  const lastLeg = track.legs.at(-1);
  if (!lastNode || !lastLeg) return null;

  const hoursSinceLast =
    (now.getTime() - lastNode.occurredAt.getTime()) / 3_600_000;
  // 마지막 목격보다 앞선 시각은 예측 대상 밖
  if (hoursSinceLast <= 0) return null;

  const kappa = straightness(track.legs);
  const sumKm = track.legs.reduce((sum, leg) => sum + leg.km, 0);
  const sumHours = track.legs.reduce((sum, leg) => sum + leg.hours, 0);
  const vEff = sumHours > 0 ? sumKm / sumHours : 0;

  const v = legVector(lastLeg);
  const len = Math.hypot(v.x, v.y);
  const unit = len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };

  const shiftKm = kappa * vEff * hoursSinceLast;
  const lat = lastNode.point.lat + (shiftKm * unit.y) / KM_PER_LAT_DEGREE;
  const lngScale = Math.max(Math.cos(lat * RAD), 0.01) * KM_PER_LAT_DEGREE;
  const lng = lastNode.point.lng + (shiftKm * unit.x) / lngScale;

  const radiusKm = Math.min(
    R_MAX_KM,
    Math.max(
      R_MIN_KM,
      SIGMA_KM[size] * Math.sqrt(hoursSinceLast) + GPS_EPSILON_KM,
    ),
  );

  return {
    center: { lat, lng },
    radiusKm,
    straightness: kappa,
    hoursSinceLast,
    bearingDeg: (Math.atan2(unit.x, unit.y) / RAD + 360) % 360,
  };
}
