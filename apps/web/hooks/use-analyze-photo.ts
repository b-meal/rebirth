"use client";

import type { AnalyzeResult } from "@rebirth/types";
import { useCallback, useEffect, useRef, useState } from "react";

// 사진 분석을 백그라운드로 돌림. 사용자가 2단계에서 위치를 정하는 동안 끝나므로
// 3단계에 도착하면 결과가 이미 있음

export type AnalyzeAdviceState = "draft" | "not-animal" | "low-quality" | "failed";

export type AnalyzeState = {
  status: "idle" | "loading" | "done" | "failed";
  advice: AnalyzeAdviceState | null;
  message: string | null;
  draft: AnalyzeResult | null;
  model: string | null;
  analyzedAt: string | null;
  start: (uploadIds: string[]) => void;
  clear: () => void;
};

type Payload = {
  draft?: AnalyzeResult;
  advice?: AnalyzeAdviceState;
  message?: string | null;
  model?: string;
  analyzedAt?: string;
};

export function useAnalyzePhoto(): AnalyzeState {
  const [status, setStatus] = useState<AnalyzeState["status"]>("idle");
  const [advice, setAdvice] = useState<AnalyzeAdviceState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnalyzeResult | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  const inflight = useRef<AbortController | null>(null);

  useEffect(() => () => inflight.current?.abort(), []);

  const start = useCallback((uploadIds: string[]) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setStatus("loading");
    setAdvice(null);
    setMessage(null);

    void (async () => {
      try {
        // 이미 올린 사진을 참조로 지목함. 두 장을 한 요청에 넣어 호출은 한 번만 함
        const response = await fetch("/api/draft/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ uploadIds }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as Payload;

        if (controller.signal.aborted) return;

        // 실패도 정상 경로. 화면은 빈 폼을 열어 직접 입력을 받음
        if (!response.ok || !payload.draft) {
          setStatus("failed");
          setAdvice("failed");
          setMessage(payload.message ?? null);
          return;
        }

        setDraft(payload.draft);
        setModel(payload.model ?? null);
        setAnalyzedAt(payload.analyzedAt ?? null);
        setAdvice(payload.advice ?? "draft");
        setMessage(payload.message ?? null);
        setStatus("done");
      } catch {
        if (controller.signal.aborted) return;
        setStatus("failed");
        setAdvice("failed");
        setMessage("자동 정리가 안 됐어요. 내용을 직접 적어 제보할 수 있어요");
      }
    })();
  }, []);

  const clear = useCallback(() => {
    inflight.current?.abort();
    setStatus("idle");
    setAdvice(null);
    setMessage(null);
    setDraft(null);
    setModel(null);
    setAnalyzedAt(null);
  }, []);

  return { status, advice, message, draft, model, analyzedAt, start, clear };
}
