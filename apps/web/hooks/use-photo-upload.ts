"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 사진을 먼저 올려 참조만 받아 둠. 제보 저장은 이 참조로만 진행함
// 원본 파일을 저장 요청에 다시 실어 보내지 않아 재시도가 재업로드가 되지 않음

export type UploadState = {
  status: "idle" | "uploading" | "ready" | "failed";
  uploadId: string | null;
  revision: number;
  message: string | null;
  upload: (file: File) => Promise<string | null>;
  clear: () => void;
};

type UploadResponse = {
  uploadId?: string;
  revision?: number;
  message?: string;
};

const FAILED = "사진을 올리지 못했습니다. 다시 골라 주십시오";

export function usePhotoUpload(): UploadState {
  const [status, setStatus] = useState<UploadState["status"]>("idle");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [revision, setRevision] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const inflight = useRef<AbortController | null>(null);
  // 대표 사진을 바꿀 때마다 올림. 늦게 온 이전 분석 결과를 버리는 기준
  const nextRevision = useRef(1);

  useEffect(() => () => inflight.current?.abort(), []);

  const upload = useCallback(async (file: File) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    const current = nextRevision.current;
    setStatus("uploading");
    setMessage(null);

    const body = new FormData();
    body.append("photo", file);
    body.append("revision", String(current));

    try {
      const response = await fetch("/api/draft/uploads", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const payload = (await response.json()) as UploadResponse;

      if (controller.signal.aborted) return null;

      if (!response.ok || !payload.uploadId) {
        setStatus("failed");
        setMessage(payload.message ?? FAILED);
        return null;
      }

      nextRevision.current = current + 1;
      setUploadId(payload.uploadId);
      setRevision(payload.revision ?? current);
      setStatus("ready");
      return payload.uploadId;
    } catch {
      if (controller.signal.aborted) return null;
      setStatus("failed");
      setMessage(FAILED);
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    inflight.current?.abort();
    setStatus("idle");
    setUploadId(null);
    setMessage(null);
  }, []);

  return { status, uploadId, revision, message, upload, clear };
}
