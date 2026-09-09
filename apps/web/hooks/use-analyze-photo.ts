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
  start: (file: File) => void;
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

  const start = useCallback((file: File) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setStatus("loading");
    setAdvice(null);
    setMessage(null);

    const body = new FormData();
    body.append("photo", file);

    void (async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          body,
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
        setMessage("자동 정리가 안 됐습니다. 내용을 직접 적어 제보할 수 있습니다");
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
