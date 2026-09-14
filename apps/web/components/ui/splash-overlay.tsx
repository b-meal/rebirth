"use client";

// design-system-allow:token 선택한 이미지의 고유 크기와 덮개 z축 값

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Box, Text } from "@seed-design/react";

import styles from "./splash-overlay.module.css";

const VISIBLE_MS = 1900;
const FADE_MS = 240;
const LOAD_TIMEOUT_MS = 3000;
const SEEN_KEY = "rebirth_splash_seen";
const SPLASH_IMAGE = "/splash/dasijip-splash-ribbon.png";

const TIMING = {
  "--splash-visible": `${VISIBLE_MS}ms`,
  "--splash-fade": `${FADE_MS}ms`,
  "--splash-load-timeout": `${LOAD_TIMEOUT_MS}ms`,
} as CSSProperties;

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 저장이 제한된 환경에서도 진입 허용
  }
}

function clearSeen(): void {
  try {
    sessionStorage.removeItem(SEEN_KEY);
  } catch {
    // 저장이 제한된 환경의 해제 생략
  }
}

export function SplashOverlay() {
  const [visible, setVisible] = useState(
    () => typeof window === "undefined" || !alreadySeen(),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    window.addEventListener("pagehide", clearSeen);
    return () => window.removeEventListener("pagehide", clearSeen);
  }, []);

  useEffect(() => {
    if (!visible) return;

    markSeen();
    // 이미지 로딩과 애니메이션 종료 이벤트가 실패해도 덮개 해제
    const timer = setTimeout(
      () => setVisible(false),
      ready ? VISIBLE_MS + FADE_MS : LOAD_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [ready, visible]);

  if (!visible) return null;

  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      right="0"
      bottom="0"
      zIndex="100"
      overflowX="hidden"
      overflowY="hidden"
      bg="palette.staticWhite"
      className={styles.root}
      style={TIMING}
      data-splash=""
      data-ready={ready}
      aria-hidden
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setVisible(false);
      }}
    >
      <Box className={styles.artwork}>
        <Image
          src={SPLASH_IMAGE}
          alt=""
          width={853}
          height={1844}
          loading="eager"
          fetchPriority="high"
          unoptimized
          draggable={false}
          className={styles.base}
          onLoad={() => setReady(true)}
          onError={() => setVisible(false)}
        />
        {/* 원본의 두 단어를 화면에서 잘라 이동한 뒤 전체 이미지로 전환 */}
        <Image
          src={SPLASH_IMAGE}
          alt=""
          width={853}
          height={1844}
          loading="eager"
          unoptimized
          draggable={false}
          className={`${styles.word} ${styles.again}`}
          data-splash-word="again"
        />
        <Image
          src={SPLASH_IMAGE}
          alt=""
          width={853}
          height={1844}
          loading="eager"
          unoptimized
          draggable={false}
          className={`${styles.word} ${styles.home}`}
          data-splash-word="home"
        />
        <Text
          textStyle="t13StaticBold"
          color="palette.carrot1000"
          className={styles.comma}
          data-splash-comma=""
        >
          ,
        </Text>
      </Box>
    </Box>
  );
}
