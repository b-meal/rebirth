// 실종 신고의 탐색 단계와 주변 제보 상황을 서버가 한 번에 계산해 문장까지 만듦
// 기준 시각은 보호자가 확정한 실종 시각 하나. 후보 제보 시각은 개체가 확정되지 않아 기준으로 쓰지 않음
// 여기 문장은 모두 규칙에서 나오므로 화면이 AI 초안 표기를 붙이지 않음

import type { TrackSize } from "./track.ts";

export type SearchPhase = "fresh" | "recent" | "stale" | "cold";

// 단계 경계 시간. 회수 데이터가 쌓이기 전이라 경험 규칙이며 로그로 보정할 값
export const PHASE_HOURS = { fresh: 6, recent: 24, stale: 72 } as const;

/** 실종 시각부터 지난 시간을 네 단계에 넣음 */
export function searchPhase(hoursSinceLost: number): SearchPhase {
  // 시계 오차로 미래 시각이 들어와도 첫 단계로 눌러 둠
  if (hoursSinceLost < PHASE_HOURS.fresh) return "fresh";
  if (hoursSinceLost < PHASE_HOURS.recent) return "recent";
  if (hoursSinceLost < PHASE_HOURS.stale) return "stale";
  return "cold";
}

export type AdviceAnimal = "dog" | "cat" | "other" | "unknown";

// 개는 시간이 갈수록 멀어지고 고양이는 가까운 곳에 숨은 채 머무는 쪽이 많아 조언을 갈라 둠
// 숫자를 넣지 않음. 며칠째와 반경은 다른 줄이 맡고 이 줄은 할 일만 말함
const ACTION_BY_PHASE: Record<"cat" | "other", Record<SearchPhase, string>> = {
  cat: {
    fresh: "집 주변 차 밑과 덤불처럼 숨을 만한 곳을 조용히 살펴보세요",
    recent: "해가 진 뒤 집 주변을 다시 살펴보세요. 고양이는 가까운 곳에 숨어 있는 경우가 많아요",
    stale: "집 주변을 반복해서 살펴보고 이웃에게 마당과 창고를 확인해 달라고 부탁해 보세요",
    cold: "멀리 가기보다 가까운 곳을 밤에 반복해서 살펴보세요. 보호소 입소 여부도 확인해 보세요",
  },
  other: {
    fresh: "지금 마지막으로 본 곳 주변을 직접 돌아보세요",
    recent: "주변 추가 제보를 확인하고 이웃에게 공유해 보세요",
    stale: "마지막 목격지 주변 이동 경로를 확인해 보세요",
    cold: "이동 가능 지역을 넓혀 찾아보세요. 보호소 입소 여부도 함께 확인해 보세요",
  },
};

/** 단계와 동물 종류로 지금 할 행동 한 줄을 고름 */
export function actionLine(phase: SearchPhase, animalType: AdviceAnimal): string {
  return ACTION_BY_PHASE[animalType === "cat" ? "cat" : "other"][phase];
}

// 커버리지. 이 반경과 기간의 전체 제보가 하한보다 적으면 눈이 없는 곳으로 봄
export const COVERAGE_RADIUS_KM = 3;
export const COVERAGE_DAYS = 7;
export const COVERAGE_MIN_REPORTS = 3;

export type Coverage = "quiet" | "active";

export function coverageOf(areaSightings: number): Coverage {
  return areaSightings < COVERAGE_MIN_REPORTS ? "quiet" : "active";
}

/** 격자 스냅 오차보다 작은 반경은 통계적으로 빈 문장이라 격자 두 배를 하한으로 둠 */
export function densityRadiusKm(radiusKm: number, gridMeters: number): number {
  return Math.max(radiusKm, (2 * gridMeters) / 1000);
}

export type SearchAround = {
  /** 반경 안 전체 발견 제보 수. 분모 */
  sightings: number;
  /** 그중 이 신고와 닮은 후보 수. 분자 */
  candidates: number;
};

export type SearchAdviceInput = {
  lostOccurredAt: Date;
  now: Date;
  animalType: AdviceAnimal;
  size: TrackSize;
  gridMeters: number;
  /** 예측 반경 또는 기본 탐색 반경 */
  radiusKm: number;
  /** 반경 안 제보 수. 중심 좌표가 없어 세지 못했으면 null */
  around: SearchAround | null;
  /** 최근 COVERAGE_DAYS 일 반경 COVERAGE_RADIUS_KM 안 전체 발견 제보 수 */
  areaSightings: number | null;
  /** 가장 최근 후보 제보 시각. 기준 시각이 아니라 따로 보여 주는 값 */
  latestCandidateAt: Date | null;
};

export type SearchAdvice = {
  phase: SearchPhase;
  hoursSinceLost: number;
  coverage: Coverage | null;
  radiusKm: number;
  around: SearchAround | null;
  latestCandidateAt: Date | null;
  lines: {
    /** 분모와 분자를 함께 말하는 줄. 셀 수 없었으면 null */
    density: string | null;
    action: string;
    /** 눈이 없는 곳일 때만 붙는 줄 */
    coverage: string | null;
  };
};

/** 분모와 분자를 한 줄에 둠. 제보가 없는 것과 후보가 없는 것은 다음 행동이 달라 갈라 말함 */
export function densityLine(radiusKm: number, around: SearchAround): string {
  const r = radiusKm.toFixed(1);
  if (around.sightings === 0) return `반경 ${r}km 안에 발견 제보가 없어요`;
  if (around.candidates === 0) {
    return `반경 ${r}km 안 발견 제보 ${around.sightings}건, 닮은 후보는 아직 없어요`;
  }
  return `반경 ${r}km 안 발견 제보 ${around.sightings}건, 그중 닮은 후보 ${around.candidates}건`;
}

export function coverageLine(areaSightings: number): string | null {
  if (coverageOf(areaSightings) === "active") return null;
  return `이 주변은 최근 ${COVERAGE_DAYS}일 발견 제보가 ${areaSightings}건이라 보는 눈이 적어요. 공유로 눈을 늘려 주세요`;
}

export function buildSearchAdvice(input: SearchAdviceInput): SearchAdvice {
  const hoursSinceLost = Math.max(
    (input.now.getTime() - input.lostOccurredAt.getTime()) / 3_600_000,
    0,
  );
  const phase = searchPhase(hoursSinceLost);
  const radiusKm = densityRadiusKm(input.radiusKm, input.gridMeters);

  return {
    phase,
    hoursSinceLost,
    coverage: input.areaSightings === null ? null : coverageOf(input.areaSightings),
    radiusKm,
    around: input.around,
    latestCandidateAt: input.latestCandidateAt,
    lines: {
      density: input.around ? densityLine(radiusKm, input.around) : null,
      action: actionLine(phase, input.animalType),
      coverage: input.areaSightings === null ? null : coverageLine(input.areaSightings),
    },
  };
}
