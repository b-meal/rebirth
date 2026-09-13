"use client";

// design-system-allow:token 로고 크기와 덮개 z축은 이 화면에서만 쓰는 값이라 토큰이 없음

import { useEffect, useState } from "react";
import Image from "next/image";
import { Text, VStack } from "@seed-design/react";

// 진입 순간 브랜드를 한 번 보여 주는 덮개
// 리다이렉트가 아니라 위에 겹치는 방식이라 아래에서 지도가 먼저 준비됨
// 브라우저 창 전체가 아니라 AppFrame 안쪽만 덮음
// 세션에 한 번만 띄우고, 페이지를 벗어나면 표시 기록을 지워 다음 진입에서 다시 보여 줌
// 걷는 일은 CSS 가 맡고 스크립트는 다 걷힌 뒤 DOM 에서 지우기만 함
// 스크립트가 늦거나 막혀도 화면이 덮인 채로 남지 않아야 함

/** 로고를 읽을 수 있는 최소 시간. 길면 진입이 느리게 느껴짐 */
const VISIBLE_MS = 1100;

/** 사라지는 동안의 페이드 길이 */
const FADE_MS = 320;

/** 이 탭에서 이미 보여 줬는지. 페이지를 벗어날 때 지움 */
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

function clearSeen(): void {
  try {
    sessionStorage.removeItem(SEEN_KEY);
  } catch {
    // 접근이 막힌 경우 애초에 저장된 값도 없음
  }
}

export function SplashOverlay() {
  // 첫 렌더에서 표시 여부를 정함. 효과에서 걷으면 이미 본 진입에도 로고가 한 프레임 스쳐 감
  // 서버에는 sessionStorage 가 없어 항상 보이고, 이는 최초 진입과 같은 결과라 어긋나지 않음
  const [visible, setVisible] = useState(
    () => typeof window === "undefined" || !alreadySeen(),
  );

  // 사이트를 벗어나면 기록을 지워 다음 진입에서 다시 보여 줌
  // 앱 안에서 화면을 오갈 때는 지우지 않아야 덮개가 다시 뜨지 않음
  // beforeunload 는 모바일 사파리에서 누락되므로 pagehide 를 씀
  useEffect(() => {
    window.addEventListener("pagehide", clearSeen);
    return () => window.removeEventListener("pagehide", clearSeen);
  }, []);

  useEffect(() => {
    // 첫 렌더에서 이미 걷힌 진입이면 치울 것이 없음
    if (!visible) return;

    markSeen();
    // CSS 가 다 걷은 뒤에 지움. 이 타이머가 돌지 않아도 화면에서는 이미 사라져 있음
    const toHidden = setTimeout(() => setVisible(false), VISIBLE_MS + FADE_MS);
    return () => clearTimeout(toHidden);
    // 마운트 때 한 번만 판단함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <VStack
      // 브라우저 창이 아니라 앱 프레임 크기에 맞춰 덮도록 absolute 로 둠
      position="absolute"
      top="0"
      left="0"
      right="0"
      bottom="0"
      zIndex="100"
      justify="center"
      align="center"
      gap="x4"
      bg="bg.layerDefault"
      className="rebirth-splash"
      // 로고를 읽을 시간만큼 기다렸다가 페이드. 길이를 여기서만 정해 CSS 와 어긋나지 않음
      style={{ animationDelay: `${VISIBLE_MS}ms`, animationDuration: `${FADE_MS}ms` }}
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
