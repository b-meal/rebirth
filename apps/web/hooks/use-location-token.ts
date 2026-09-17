"use client";

import type { ResolveLocation, ResolvedLocation } from "@rebirth/types";
import { useCallback, useEffect, useRef, useState } from "react";

// 좌표를 서버에 맡기고 참조만 받아 둠
// 폼 상태와 sessionStorage 에 좌표 숫자가 남지 않게 하는 지점. POL-08

export type LocationTokenState = {
  status: "idle" | "resolving" | "ready" | "failed";
  resolved: ResolvedLocation | null;
  message: string | null;
  resolve: (input: ResolveLocation) => Promise<ResolvedLocation | null>;
  clear: () => void;
};

const FAILED = "위치를 확인하지 못했습니다. 지역을 다시 골라 주십시오";

export function useLocationToken(): LocationTokenState {
  const [status, setStatus] = useState<LocationTokenState["status"]>("idle");
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const inflight = useRef<AbortController | null>(null);

  useEffect(() => () => inflight.current?.abort(), []);

  const resolve = useCallback(async (input: ResolveLocation) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setStatus("resolving");
    setMessage(null);

    try {
      const response = await fetch("/api/draft/location/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const payload = (await response.json()) as ResolvedLocation & {
        message?: string;
      };

      if (controller.signal.aborted) return null;

      if (!response.ok || !payload.locationToken) {
        setStatus("failed");
        setMessage(payload.message ?? FAILED);
        return null;
      }

      setResolved(payload);
      setStatus("ready");
      return payload;
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
    setResolved(null);
    setMessage(null);
  }, []);

  return { status, resolved, message, resolve, clear };
}
