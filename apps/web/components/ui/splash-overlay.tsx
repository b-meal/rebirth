"use client";

// design-system-allow:token 로고 크기와 덮개 z축은 이 화면에서만 쓰는 값이라 토큰이 없음

import { useEffect, useState } from "react";
import Image from "next/image";
import { Text, VStack } from "@seed-design/react";

// 진입 순간 브랜드를 한 번 보여 주는 덮개
// 리다이렉트가 아니라 위에 겹치는 방식이라 아래에서 지도가 먼저 준비됨
// 탭을 옮길 때마다 다시 뜨면 성가시므로 세션에 한 번만 띄움

/** 로고를 읽을 수 있는 최소 시간. 길면 진입이 느리게 느껴짐 */
const VISIBLE_MS = 1100;

/** 사라지는 동안의 페이드 길이 */
const FADE_MS = 320;

/** 이 탭에서 이미 보여 줬는지. 새로고침까지는 유지되고 창을 닫으면 초기화됨 */
const SEEN_KEY = "rebirth_splash_seen";

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // 사생활 보호 모드에서는 접근이 막힘. 그때는 매번 보여 줌
    return false;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 저장에 실패해도 화면 동작에는 영향이 없음
  }
}

type Phase = "hidden" | "visible" | "leaving";

export function SplashOverlay() {
  // 덮인 상태로 시작함. 서버 렌더와 같은 결과라 하이드레이션이 어긋나지 않고
  // 자바스크립트가 늦어도 흰 화면 대신 로고가 보임
  const [phase, setPhase] = useState<Phase>("visible");

  useEffect(() => {
    // 이미 본 탭이면 다음 페인트에서 걷음. 효과 안에서 바로 바꾸면 렌더가 한 번 더 돎
    if (alreadySeen()) {
      const raf = requestAnimationFrame(() => setPhase("hidden"));
      return () => cancelAnimationFrame(raf);
    }

    markSeen();
    const toLeaving = setTimeout(() => setPhase("leaving"), VISIBLE_MS);
    const toHidden = setTimeout(() => setPhase("hidden"), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(toLeaving);
      clearTimeout(toHidden);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <VStack
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      zIndex="100"
      justify="center"
      align="center"
      gap="x4"
      bg="bg.layerDefault"
      // 페이드와 클릭 통과는 SEED 스타일 프롭에 없어 style 로 넘김
      style={{
        opacity: phase === "leaving" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <Image src="/logo/logo-mark-512.png" alt="" width={96} height={96} priority />
      <VStack align="center" gap="x1">
        <Text as="p" textStyle="screenTitle" color="fg.neutral">
          다시집
        </Text>
        <Text textStyle="t4Regular" color="fg.neutralMuted" align="center">
          길에서 만난 동물이 집으로 돌아가는 길
        </Text>
      </VStack>
    </VStack>
  );
}
