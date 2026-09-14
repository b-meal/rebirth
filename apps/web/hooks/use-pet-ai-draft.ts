"use client";

import type { AnalyzeResult } from "@rebirth/types";
import { useCallback, useRef, useState } from "react";

// 사진 분석 결과를 우리 동물 폼이 쓸 수 있는 값으로만 추림
//
// 제보 초안과 목적이 다름. 제보는 모르는 동물을 묘사하고
// 우리 동물은 주인이 이미 아는 동물을 실종 신고에 옮겨 붙으려고 미리 적어 둠
// 그래서 오늘 사진의 일시적 상태(condition)와 제보 본문(story)은 받지 않음
// 부상·귀 끝·목줄도 이 폼에 칸이 없어 버림

/** AI 가 채우는 칸. 채운 뒤 사용자가 고치면 배지를 떼는 기준 */
export const PET_AI_FIELDS = ["animalType", "size", "colors", "breedGuess"] as const;

export type PetAiField = (typeof PET_AI_FIELDS)[number];

export type PetAiValues = {
  animalType: string;
  size: string;
  colors: string[];
  breedGuess: string;
};

export type PetAiOptions = {
  /** 폼이 고를 수 있는 동물 종류 */
  animalOptions: readonly string[];
  /** 폼이 고를 수 있는 크기 */
  sizeOptions: readonly string[];
  /** 폼이 고를 수 있는 털색. 여기 없는 값은 칩이 없어 넣어도 보이지 않음 */
  colorOptions: readonly string[];
};

/** 칩 이름과 맞대 보려고 공백과 대소문자를 지움 */
function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

/**
 * AI 가 준 털색을 폼의 칩 이름으로 맞춤
 * 제보 폼은 베이지·삼색까지 고를 수 있어 그대로 넣으면 여기서는 조용히 사라짐
 * 맞는 칩이 없으면 버리되, 칩 이름을 품고 있으면 그쪽으로 붙임
 */
export function matchColors(given: string[], options: readonly string[]): string[] {
  const matched: string[] = [];

  for (const raw of given) {
    const value = normalize(raw);
    if (!value) continue;

    const hit =
      options.find((option) => normalize(option) === value) ??
      // "베이지 얼룩" 처럼 칩 이름을 품고 있으면 그 칩으로 봄
      options.find((option) => value.includes(normalize(option)));

    if (hit && !matched.includes(hit)) matched.push(hit);
  }

  return matched;
}

/**
 * 분석 결과에서 이 폼이 쓸 값만 골라냄
 * 고르지 못하는 값(unknown 처럼 칩이 없는 것)은 넣지 않음
 * 넣으면 사용자가 되돌릴 수 없는 채로 기본값이 조용히 바뀜
 */
export function toPetValues(
  result: AnalyzeResult,
  options: PetAiOptions,
): Partial<PetAiValues> {
  // 동물을 못 찾았으면 나머지 값도 근거가 없음
  // 스키마가 size 와 color 를 필수로 받아 unknown 일 때도 값이 채워져 오는데
  // 그대로 넣으면 동물이 없는 사진에서 털색이 골라진 채로 폼이 열림
  if (!options.animalOptions.includes(result.animalType)) return {};

  const values: Partial<PetAiValues> = { animalType: result.animalType };

  if (options.sizeOptions.includes(result.size)) {
    values.size = result.size;
  }

  const colors = matchColors(result.color, options.colorOptions);
  if (colors.length > 0) values.colors = colors;

  // 품종은 단정하지 않음. 값이 있어도 화면이 추정으로 읽히게 라벨과 배지를 함께 둠
  if (result.breedGuess) values.breedGuess = result.breedGuess;

  return values;
}

export type PetAiDraftState = {
  /** AI 가 채웠고 아직 사용자가 손대지 않은 칸 */
  filled: PetAiField[];
  /** 초안을 받은 적이 있는지. 안내 줄을 내놓는 기준 */
  applied: boolean;
  /** 그 칸에 AI 배지를 붙일지 */
  isFilled: (field: PetAiField) => boolean;
  /** 분석 결과를 폼 값으로 바꿔 돌려줌. 사용자가 이미 고친 칸은 빼고 돌려줌 */
  apply: (result: AnalyzeResult, options: PetAiOptions) => Partial<PetAiValues>;
  /** 사용자가 그 칸을 고침. 배지를 뗌 */
  touch: (field: PetAiField) => void;
  reset: () => void;
};

export function usePetAiDraft(): PetAiDraftState {
  const [filled, setFilled] = useState<PetAiField[]>([]);
  const [applied, setApplied] = useState(false);

  // 사용자가 손댄 칸. 초안이 늦게 와도 고친 값을 덮지 않게 렌더와 무관하게 들고 있음
  const touched = useRef<Set<PetAiField>>(new Set());

  const apply = useCallback((result: AnalyzeResult, options: PetAiOptions) => {
    const values = toPetValues(result, options);

    // 이미 고친 칸은 덮지 않음. 고친 값이 사라지면 손댈 이유가 없어짐
    for (const field of PET_AI_FIELDS) {
      if (touched.current.has(field)) delete values[field];
    }

    setFilled(PET_AI_FIELDS.filter((field) => field in values));
    setApplied(true);
    return values;
  }, []);

  const touch = useCallback((field: PetAiField) => {
    touched.current.add(field);
    setFilled((current) => current.filter((item) => item !== field));
  }, []);

  const reset = useCallback(() => {
    touched.current.clear();
    setFilled([]);
    setApplied(false);
  }, []);

  const isFilled = useCallback((field: PetAiField) => filled.includes(field), [filled]);

  return { filled, applied, isFilled, apply, touch, reset };
}
