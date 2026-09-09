"use client";

import type { AnalyzeResult, CareSituation } from "@rebirth/types";
import { useCallback, useEffect, useState } from "react";

import type { PhotoItem } from "@/lib/image";

// 4단계 폼의 상태. 새로고침과 실수 이탈에서 살리려 sessionStorage 에 보관
// 사진은 File 이라 직렬화되지 않으므로 저장하지 않음. 사진이 없으면 1단계로 돌아감

const STORAGE_KEY = "rebirth:report-draft";

export type ReportStep = 1 | 2 | 3 | 4;

// AI 초안에서 사용자가 고칠 수 있는 필드. ai_edited_fields 에 이 이름으로 기록
export const DRAFT_FIELDS = [
  "animalType",
  "appearance",
  "colors",
  "size",
  "collar",
  "injury",
  "earTip",
] as const;

export type DraftField = (typeof DRAFT_FIELDS)[number];

export type ReportDraft = {
  careSituation: CareSituation | null;
  // 2단계
  areaName: string | null;
  areaCode: string | null;
  coordinates: { lat: number; lng: number } | null;
  landmark: string;
  // 3단계
  animalType: "dog" | "cat" | "other" | "unknown";
  appearance: string;
  colors: string[];
  size: "small" | "medium" | "large" | "unknown";
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  // 4단계
  conditionTags: string[];
  // 서버 렌더와 값이 갈리지 않게 빈 문자열로 시작하고 4단계에서 채움
  occurredAt: string;
  // AI 초안 원본과 사용자가 고친 필드
  aiRaw: AnalyzeResult | null;
  aiModel: string | null;
  aiAnalyzedAt: string | null;
  editedFields: DraftField[];
};

function emptyDraft(): ReportDraft {
  return {
    careSituation: null,
    areaName: null,
    areaCode: null,
    coordinates: null,
    landmark: "",
    animalType: "unknown",
    appearance: "",
    colors: [],
    size: "unknown",
    collar: null,
    injury: null,
    earTip: null,
    conditionTags: [],
    occurredAt: "",
    aiRaw: null,
    aiModel: null,
    aiAnalyzedAt: null,
    editedFields: [],
  };
}

function readStored(): ReportDraft | null {
  // 서버 렌더에는 sessionStorage 가 없음
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...emptyDraft(), ...(JSON.parse(raw) as Partial<ReportDraft>) };
  } catch {
    return null;
  }
}

export type UseReportDraft = {
  draft: ReportDraft;
  photo: PhotoItem | null;
  setPhoto: (photo: PhotoItem | null) => void;
  // AI 초안을 채움. 사용자가 이미 고친 필드는 덮지 않음
  applyAiDraft: (result: AnalyzeResult, model: string, analyzedAt: string) => void;
  // 사용자 수정. 초안과 다른 값이면 editedFields 에 기록
  edit: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void;
  reset: () => void;
};

export function useReportDraft(): UseReportDraft {
  // 서버 렌더에는 sessionStorage 가 없어 빈 초안으로 시작함
  // 복원은 마운트 뒤 한 번만 반영해 하이드레이션 불일치를 만들지 않음
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const [photo, setPhoto] = useState<PhotoItem | null>(null);

  const restore = useCallback(() => {
    const stored = readStored();
    if (stored) setDraft(stored);
  }, []);

  useEffect(() => {
    // 마운트 직후 한 프레임에서 복원. effect 본문에서 직접 setState 하지 않음
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [restore]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // 사파리 프라이빗 모드는 쓰기가 막힘. 복원을 포기하고 진행
    }
  }, [draft]);

  const applyAiDraft = useCallback(
    (result: AnalyzeResult, model: string, analyzedAt: string) => {
      setDraft((prev) => {
        const edited = new Set(prev.editedFields);
        const keep = <T,>(field: DraftField, next: T, current: T) =>
          edited.has(field) ? current : next;

        return {
          ...prev,
          animalType: keep("animalType", result.animalType, prev.animalType),
          appearance: keep("appearance", result.appearance, prev.appearance),
          colors: keep("colors", result.color, prev.colors),
          size: keep("size", result.size, prev.size),
          collar: keep("collar", result.collarOrHarness, prev.collar),
          injury: keep("injury", result.visibleInjury, prev.injury),
          earTip: keep("earTip", result.earTip, prev.earTip),
          // 상태 태그는 초안의 condition 문장을 그대로 넣지 않음. 4단계에서 사용자가 고름
          aiRaw: result,
          aiModel: model,
          aiAnalyzedAt: analyzedAt,
        };
      });
    },
    [],
  );

  const edit = useCallback(
    <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        // 초안이 있는 필드를 고쳤을 때만 기록. 측정의 근거라 초안 없이 적은 값은 제외
        if (
          prev.aiRaw &&
          (DRAFT_FIELDS as readonly string[]).includes(key as string) &&
          !prev.editedFields.includes(key as DraftField)
        ) {
          next.editedFields = [...prev.editedFields, key as DraftField];
        }
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    setPhoto(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }, []);

  return { draft, photo, setPhoto, applyAiDraft, edit, reset };
}
