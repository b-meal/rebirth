"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 스플래시를 잠깐 보여 준 뒤 목적지로 넘김
// 목적지는 서버가 이미 정해 내려주므로 이 컴포넌트는 시점만 맡음

type Props = {
  to: string;
  delayMs: number;
};

export function SplashRedirect({ to, delayMs }: Props) {
  const router = useRouter();

  useEffect(() => {
    // 다음 화면을 미리 받아 둬 대기 시간이 이동 시간과 겹치게 함
    router.prefetch(to);
    const timer = setTimeout(() => router.replace(to), delayMs);
    return () => clearTimeout(timer);
  }, [router, to, delayMs]);

  return null;
}
