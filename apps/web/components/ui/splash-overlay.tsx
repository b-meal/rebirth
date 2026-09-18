"use client";

// design-system-allow:token 선택한 이미지의 고유 크기와 덮개 z축 값

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Box, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import { armSplashGate, releaseSplashGate } from "@/lib/splash-gate";

import styles from "./splash-overlay.module.css";

const FADE_MS = 240;
const LOAD_TIMEOUT_MS = 3000;
// 쉼표를 그리는 글꼴을 기다리는 상한, 넘기면 덮개까지 늦어지므로 대체 글꼴로 시작
const FONT_WAIT_MS = 1000;
// 로고가 뜨는 시점은 이 파일이 도착한 순간이라 무게를 가장 먼저 줄임, PNG 563KB 대비 9KB
const SPLASH_IMAGE = "/splash/dasijip-splash-ribbon.webp";

const TIMING = {
  "--splash-fade": `${FADE_MS}ms`,
  "--splash-load-timeout": `${LOAD_TIMEOUT_MS}ms`,
} as CSSProperties;

export function SplashOverlay({ maxWidth }: { maxWidth: string }) {
  // 공통 프레임의 마운트 상태로 문서 첫 진입과 내부 화면 이동 구분
  const [visible, setVisible] = useState(true);
  // effect 보다 먼저 잠가야 같은 커밋의 위치 요청이 덮개를 기다림
  armSplashGate();

  const [imageReady, setImageReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);

  // 쉼표만 웹폰트로 그려 글꼴이 늦게 닿으면 보이는 중에 글리프가 바뀌므로 로고 이미지와 함께 기다림
  const ready = imageReady && fontReady;

  useEffect(() => {
    let alive = true;
    const done = () => {
      if (alive) setFontReady(true);
    };
    const timer = setTimeout(done, FONT_WAIT_MS);
    // 글꼴 API 가 없는 브라우저는 상한 타이머만 남음
    void document.fonts?.ready.then(done);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!visible || ready) return;

    // 이미지가 끝내 안 오면 덮개를 걷어 뒤 화면을 막지 않음
    const timer = setTimeout(() => setVisible(false), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, visible]);

  // 덮개가 걷힌 뒤에야 위치 권한 팝업이 뜨도록 알림
  useEffect(() => {
    if (!visible) releaseSplashGate();
  }, [visible]);

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
          onLoad={() => setImageReady(true)}
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
        {/* ghost 는 마우스가 있는 기기에만 호버 면을 깔고 터치에서는 누르는 동안만 반응함 */}
        <ActionButton variant="ghost" size="large" color="fg.neutralSubtle" onClick={dismiss}>
          지도 둘러보기
        </ActionButton>
      </VStack>

      <noscript>
        <style>{"[data-splash] { display: none; }"}</style>
      </noscript>
    </Box>
  );
}
