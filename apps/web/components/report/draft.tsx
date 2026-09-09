"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DRAFT_STORAGE_KEY,
  EMPTY_DRAFT,
  parseStored,
  toStored,
  type ReportDraft,
} from "../../lib/report-draft";
import { usePhotoPicker, type PhotoPickerState } from "../../hooks/use-photo-picker";

// 구독할 이벤트가 없는 읽기 전용 스토어
const noopSubscribe = () => () => {};

function readRaw() {
  try {
    return sessionStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    // 쿠키·저장소 차단 환경에서도 폼은 계속 진행
    return null;
  }
}

function writeStored(draft: ReportDraft) {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toStored(draft)));
  } catch {
    // 저장 실패는 입력 흐름을 막지 않음
  }
}

type ReportDraftValue = {
  draft: ReportDraft;
  update: (patch: Partial<ReportDraft>) => void;
  reset: () => void;
  picker: PhotoPickerState;
  // 복원 전 가드가 돌아 앞 단계로 튕기는 것을 막는 표시
  restored: boolean;
};

const ReportDraftContext = createContext<ReportDraftValue | null>(null);

export function ReportDraftProvider({ children }: { children: ReactNode }) {
  // 서버 렌더에서는 빈 값, 마운트 후 저장분을 읽어 hydration 을 어긋내지 않음
  const raw = useSyncExternalStore(noopSubscribe, readRaw, () => null);
  const restored = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const [overrides, setOverrides] = useState<Partial<ReportDraft>>({});
  // 대표 사진 1장. 여러 장은 L1 범위
  const picker = usePhotoPicker({ maxCount: 1 });

  const draft = useMemo<ReportDraft>(
    () => ({ ...EMPTY_DRAFT, ...parseStored(raw), ...overrides }),
    [raw, overrides],
  );

  useEffect(() => {
    if (restored) writeStored(draft);
  }, [draft, restored]);

  const update = useCallback((patch: Partial<ReportDraft>) => {
    setOverrides((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    // 저장분까지 덮도록 모든 항목을 비운 값으로 교체
    setOverrides(EMPTY_DRAFT);
    picker.clear();
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // 저장소 차단 환경에서는 메모리 초기화만으로 충분
    }
  }, [picker]);

  const value = useMemo<ReportDraftValue>(
    () => ({ draft, update, reset, picker, restored }),
    [draft, update, reset, picker, restored],
  );

  return (
    <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>
  );
}

export function useReportDraft() {
  const value = useContext(ReportDraftContext);
  if (!value) throw new Error("ReportDraftProvider 안에서만 사용할 수 있습니다");
  return value;
}
