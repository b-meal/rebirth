import type { LatLng } from "@rebirth/core/location/geo";
import type { CareSituation } from "@rebirth/types";

export const REPORT_STEPS = [1, 2, 3, 4] as const;
export type ReportStep = (typeof REPORT_STEPS)[number];

export const TOTAL_STEPS = REPORT_STEPS.length;

export type SightingArea = {
  areaName: string;
  fullName: string;
  placeName: string | null;
};

export type ReportDraft = {
  // 모를 때 임의로 보호 중을 저장하지 않아 미선택은 null 로 둠
  careSituation: CareSituation | null;
  area: SightingArea | null;
  // 정확 좌표. 서버 전송용이며 브라우저에 남기지 않음
  point: LatLng | null;
  appearance: string;
};

export const EMPTY_DRAFT: ReportDraft = {
  careSituation: null,
  area: null,
  point: null,
  appearance: "",
};

export const DRAFT_STORAGE_KEY = "rebirth.report.draft";

// 브라우저에 보관하는 비민감 항목. 사진과 정확 좌표는 제외
export type StoredDraft = Pick<ReportDraft, "careSituation" | "area" | "appearance">;

export function toStored({ careSituation, area, appearance }: ReportDraft): StoredDraft {
  return { careSituation, area, appearance };
}

export function parseStored(raw: string | null): Partial<ReportDraft> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredDraft;
    return toStored({ ...EMPTY_DRAFT, ...parsed });
  } catch {
    // 손상된 값은 빈 초안으로 다시 시작
    return {};
  }
}

// 선행 조건을 채운 가장 앞의 미완료 단계. POL-49 의 단계 가드 기준
export function firstIncompleteStep(draft: ReportDraft, photoCount: number): ReportStep {
  if (photoCount === 0 || !draft.careSituation) return 1;
  if (!draft.area) return 2;
  if (!draft.appearance.trim()) return 3;
  return 4;
}

// 범위 밖 step 은 1 단계로. URL 은 진행 표시일 뿐 유효성을 보장하지 않음
export function parseStep(raw: string | null): ReportStep {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= TOTAL_STEPS
    ? (value as ReportStep)
    : 1;
}

// 요청한 단계와 선행 조건 중 앞선 쪽. step=4 로 직접 들어와도 미완료 단계로 돌림
export function allowedStep(requested: ReportStep, limit: ReportStep): ReportStep {
  return Math.min(requested, limit) as ReportStep;
}
