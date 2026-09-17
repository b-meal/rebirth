"use client";

// design-system-allow:token 선택한 이미지의 고유 크기와 덮개 z축 값

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Box, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import styles from "./splash-overlay.module.css";

const FADE_MS = 240;
const LOAD_TIMEOUT_MS = 3000;
const SPLASH_IMAGE = "/splash/dasijip-splash-ribbon.png";

const TIMING = {
  "--splash-fade": `${FADE_MS}ms`,
  "--splash-load-timeout": `${LOAD_TIMEOUT_MS}ms`,
} as CSSProperties;

export function SplashOverlay({ maxWidth }: { maxWidth: string }) {
  // 공통 프레임의 마운트 상태로 문서 첫 진입과 내부 화면 이동 구분
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible || ready) return;

    // 이미지가 끝내 안 오면 덮개를 걷어 뒤 화면을 막지 않음
    const timer = setTimeout(() => setVisible(false), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, visible]);

  if (!visible) return null;

  const dismiss = () => setVisible(false);

  return (
    <Box
      position="fixed"
      top="0"
      left="50%"
      bottom="0"
      width="full"
      maxWidth={maxWidth}
      zIndex="100"
      overflowX="hidden"
      overflowY="hidden"
      bg="palette.staticWhite"
      className={styles.root}
      style={TIMING}
      data-splash=""
      data-ready={ready}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setVisible(false);
      }}
    >
      <Box className={styles.artwork} aria-hidden>
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
          color="palette.staticBlack"
          className={styles.comma}
          data-splash-comma=""
        >
          ,
        </Text>
      </Box>

      {/* 로고가 올라간 자리 아래. 진입한 사람이 곧바로 할 일 하나만 둠 */}
      <VStack className={styles.actions} align="stretch" gap="x3" px="spacingX.globalGutter">
        <ActionButton size="large" asChild onClick={dismiss}>
          <Link href="/report">제보하기</Link>
        </ActionButton>
        <VStack asChild align="center">
          <button type="button" onClick={dismiss}>
            <Text textStyle="t4Bold" color="fg.neutralSubtle">
              지도 둘러보기
            </Text>
          </button>
        </VStack>
      </VStack>

      <noscript>
        <style>{"[data-splash] { display: none; }"}</style>
      </noscript>
    </Box>
  );
}
