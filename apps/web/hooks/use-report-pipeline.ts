"use client";

import type { AnalyzeResult } from "@rebirth/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PhotoItem } from "@/lib/image";
import { useAnalyzePhoto } from "./use-analyze-photo";
import { usePhotoUpload } from "./use-photo-upload";

// 사진을 올려 참조를 받고 그 참조로 초안을 받는 한 줄기를 한 자리에 둠
// 화면은 지금 어느 갈래에 있는지만 보고 그리므로 어떤 불리언을 맞춰야 하는지 고민하지 않음
// 갈래 밖의 조합이 아예 만들어지지 않아 시작한 적 없는 상태를 기다리는 중으로 그릴 수 없음
//
// 값어치는 갈래를 나눈 데 있지 훅으로 묶은 데 있지 않음
// 앞서 아직 시작 안 함 을 기다리는 중 으로 읽어 스켈레톤이 끝나지 않는 화면이 나왔는데
// 그 애매함이 조합으로 상태를 만들던 자리에서 왔으므로 조합을 없애는 것이 고침임
//
// Context 로 내리지 않음. 트리가 ReportForm 에서 한 단계라 뚫고 내려갈 깊이가 없고
// 상태 하나를 Context 에 두면 글자 한 자 칠 때마다 모든 소비자가 다시 그려져
// 지금 props 로 공짜로 얻는 건너뛰기를 memo 로 되사야 함
// 자식이 provider 안에서만 살 수 있게 되는 것도 손해라 값을 받는 쪽은 props 로 둠
//
// 단계와 주소는 이 훅이 들지 않음. URL 이 이미 원천이라 끌어오면 원천이 둘이 됨

/** 초안이 도착했을 때의 권고. 되돌릴 만큼 나쁜 것은 갈래로 따로 뺌 */
export type ReadyAdvice = "draft" | "low-quality";

export type ReportPipelinePhase =
  /** 아직 시작하지 않음. 기다리는 표시를 그리지 않음 */
  | { name: "idle" }
  | { name: "uploading" }
  | { name: "uploadFailed"; message: string }
  | { name: "analyzing" }
  | {
      name: "ready";
      uploadIds: string[];
      draft: AnalyzeResult;
      advice: ReadyAdvice;
      message: string | null;
      model: string | null;
      analyzedAt: string | null;
    }
  /** 동물이 보이지 않음. 2단계에서 할 일이 없어 화면을 되돌리는 쪽이 처리함 */
  | { name: "rejected"; message: string | null }
  | { name: "failed"; message: string | null };

export type ReportPipelineOptions = {
  /** 2단계에 있는 동안만 올리고 분석함. 1단계에서는 아무것도 시작하지 않음 */
  active: boolean;
  onRejected?: (message: string | null) => void;
  onFailed?: (message: string | null) => void;
};

export type ReportPipelineState = {
  phase: ReportPipelinePhase;
  /** 위치를 물어도 되는 시점. 참조가 하나라도 있으면 초안 세션이 선 것 */
  sessionReady: boolean;
  /** 올리다 멈춘 자리에서 같은 사진으로 다시 올림 */
  retryUpload: () => void;
  /** 분석 실패 알림을 닫을 때. 다음에 2단계로 오면 분석만 다시 함 */
  clearAnalysis: () => void;
  /** 사진이 바뀌었을 때. 앞 묶음의 참조와 초안을 버림 */
  reset: () => void;
};

const UPLOAD_FAILED = "사진을 올리지 못했어요";

export function useReportPipeline(
  photos: PhotoItem[],
  { active, onRejected, onFailed }: ReportPipelineOptions,
): ReportPipelineState {
  const upload = usePhotoUpload();
  const [uploadIds, setUploadIds] = useState<string[]>([]);

  const onRejectedRef = useRef(onRejected);
  const onFailedRef = useRef(onFailed);
  useEffect(() => {
    onRejectedRef.current = onRejected;
    onFailedRef.current = onFailed;
  }, [onRejected, onFailed]);

  const analyze = useAnalyzePhoto({
    onDone: ({ advice, message }) => {
      if (advice === "not-animal") onRejectedRef.current?.(message);
    },
    onFail: (message) => onFailedRef.current?.(message),
  });

  // 같은 사진 묶음은 한 번만 올림. StrictMode 의 이펙트 두 번 실행에서도 두 건이 생기지 않음
  const uploadedKey = useRef<string | null>(null);
  const key = photos.map((photo) => photo.id).join(",");

  const { status: uploadStatus, message: uploadMessage, upload: startUpload, clear: clearUpload } = upload;
  const {
    status: analyzeStatus,
    advice,
    message: analyzeMessage,
    draft,
    model,
    analyzedAt,
    start: startAnalyze,
    clear: clearAnalyze,
  } = analyze;

  // 쓰는 쪽이 이펙트 의존성에 그대로 넣을 수 있게 같은 값이면 같은 갈래를 돌려줌
  const phase = useMemo(
    () =>
      derivePhase({
        active,
        uploadStatus,
        uploadMessage,
        uploadIds,
        analyzeStatus,
        advice,
        analyzeMessage,
        draft,
        model,
        analyzedAt,
      }),
    [
      active,
      uploadStatus,
      uploadMessage,
      uploadIds,
      analyzeStatus,
      advice,
      analyzeMessage,
      draft,
      model,
      analyzedAt,
    ],
  );

  // 다음에 할 일 하나만 고름. 참조가 다 모였으면 분석하고 아니면 올림
  // 그리는 갈래가 아니라 끝난 일을 보고 고름. 갈래를 보면 기다림 표시가 시작을 막음
  useEffect(() => {
    if (!active || analyzeStatus !== "idle") return;

    if (uploadIds.length > 0) {
      startAnalyze(uploadIds);
      return;
    }
    // 올리다 멈춘 자리는 사람이 다시 누를 때까지 기다림
    if (uploadStatus === "failed" || uploadStatus === "uploading") return;
    if (photos.length === 0 || uploadedKey.current === key) return;
    uploadedKey.current = key;

    void (async () => {
      const ids: string[] = [];
      // 훅이 앞 요청을 취소하므로 순서대로 올림
      for (const photo of photos) {
        const id = await startUpload(photo.file);
        // 한 장이라도 못 올리면 참조가 모자라 등록이 끝까지 막힘
        // 열쇠를 풀어 두어 다시 시도가 같은 사진으로 처음부터 돌게 함
        if (!id) {
          uploadedKey.current = null;
          return;
        }
        ids.push(id);
      }
      setUploadIds(ids);
    })();
  }, [
    active,
    analyzeStatus,
    uploadStatus,
    uploadIds,
    photos,
    key,
    startUpload,
    startAnalyze,
  ]);

  const retryUpload = useCallback(() => {
    uploadedKey.current = null;
    clearUpload();
  }, [clearUpload]);

  const clearAnalysis = useCallback(() => {
    clearAnalyze();
  }, [clearAnalyze]);

  const reset = useCallback(() => {
    uploadedKey.current = null;
    setUploadIds([]);
    clearUpload();
    clearAnalyze();
  }, [clearUpload, clearAnalyze]);

  return {
    phase,
    sessionReady: uploadIds.length > 0,
    retryUpload,
    clearAnalysis,
    reset,
  };
}

type DeriveInput = {
  active: boolean;
  uploadStatus: ReturnType<typeof usePhotoUpload>["status"];
  uploadMessage: string | null;
  uploadIds: string[];
  analyzeStatus: ReturnType<typeof useAnalyzePhoto>["status"];
  advice: ReturnType<typeof useAnalyzePhoto>["advice"];
  analyzeMessage: string | null;
  draft: AnalyzeResult | null;
  model: string | null;
  analyzedAt: string | null;
};

// 분석 결과가 업로드 결과보다 뒤에 오므로 끝난 쪽부터 봄
function derivePhase(input: DeriveInput): ReportPipelinePhase {
  if (input.analyzeStatus === "done" && input.draft) {
    if (input.advice === "not-animal") return { name: "rejected", message: input.analyzeMessage };
    return {
      name: "ready",
      uploadIds: input.uploadIds,
      draft: input.draft,
      advice: input.advice === "low-quality" ? "low-quality" : "draft",
      message: input.analyzeMessage,
      model: input.model,
      analyzedAt: input.analyzedAt,
    };
  }
  if (input.analyzeStatus === "failed") return { name: "failed", message: input.analyzeMessage };
  if (input.analyzeStatus === "loading") return { name: "analyzing" };

  if (input.uploadStatus === "failed") {
    return { name: "uploadFailed", message: input.uploadMessage ?? UPLOAD_FAILED };
  }
  if (input.uploadStatus === "uploading") return { name: "uploading" };
  // 참조를 받은 뒤 분석이 시작되기까지의 한 프레임. 비어 보이지 않게 이어서 기다림으로 둠
  if (input.active && input.uploadIds.length > 0) return { name: "analyzing" };

  return { name: "idle" };
}
