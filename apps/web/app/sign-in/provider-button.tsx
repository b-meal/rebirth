"use client";

// design-system-allow:color,space,radius,raw-element 제공자 브랜드 가이드라인이 정한 고정값

import { createContext, useContext, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Box, HStack, Text } from "@seed-design/react";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import { NEXT_PARAM, type ProviderDescriptor } from "@rebirth/core/auth";

import { signInWithProvider } from "./actions";

// 두 버튼을 같은 뼈대로 그림
// 카카오 배포 이미지를 버튼째 쓰면 아이콘 자리와 글자 굵기가 구글과 어긋나
// 이미지는 심벌만 쓰고 바탕과 문구는 여기서 같은 규칙으로 맞춤

// 손가락으로 누르는 자리라 44 를 넘기고, 두 버튼이 같은 높이를 씀
const BUTTON_HEIGHT = 52;
const BUTTON_RADIUS = 12;

// 두 심벌이 같은 자리를 차지해야 글자 시작점이 버튼끼리 어긋나지 않음
const SYMBOL_SLOT = 22;
const EDGE_PADDING = 16;

/** 제공자가 정한 바탕·글자색. 브랜드 가이드라인 값이라 토큰으로 바꾸지 않음 */
const BRAND = {
  kakao: {
    background: "#FEE500",
    color: "rgba(0, 0, 0, 0.85)",
    border: "none",
  },
  google: {
    background: "#FFFFFF",
    color: "#1F1F1F",
    border: "1px solid #747775",
  },
} as const;

// 화면 제목이 이미 로그인이라 버튼까지 로그인을 반복하지 않음
const LABEL = {
  kakao: "카카오로 계속하기",
  google: "Google로 계속하기",
} as const;

type ProviderId = ProviderDescriptor["id"];

/**
 * 어느 버튼이 시작했는지를 버튼끼리 나눠 봄
 * useFormStatus 는 자기 form 만 알아서, 한쪽을 누른 뒤 다른 쪽을 또 누르는 것을 못 막음
 * 제공자 화면으로 넘어가기 전까지 이 화면이 그대로 남아 있어 두 번 눌리기 쉬움
 */
const StartedContext = createContext<{
  started: ProviderId | null;
  start: (id: ProviderId) => void;
}>({ started: null, start: () => undefined });

/** 로그인 버튼들을 감싸 한 번에 하나만 시작되게 함 */
export function ProviderButtonGroup({ children }: { children: ReactNode }) {
  const [started, setStarted] = useState<ProviderId | null>(null);
  return (
    <StartedContext.Provider value={{ started, start: setStarted }}>
      {children}
    </StartedContext.Provider>
  );
}

type Props = {
  provider: ProviderDescriptor;
  next: string;
};

export function ProviderButton({ provider, next }: Props) {
  const { start } = useContext(StartedContext);

  return (
    <form action={signInWithProvider} onSubmit={() => start(provider.id)}>
      <input type="hidden" name="provider" value={provider.id} />
      <input type="hidden" name={NEXT_PARAM} value={next} />
      <SubmitButton providerId={provider.id} />
    </form>
  );
}

/** useFormStatus 는 form 안에서만 값을 읽으므로 버튼을 따로 둠 */
function SubmitButton({ providerId }: { providerId: ProviderId }) {
  const { pending } = useFormStatus();
  const { started } = useContext(StartedContext);
  const brand = BRAND[providerId];

  // 이 버튼이 시작했는지와, 다른 버튼이 시작해 기다리는 중인지를 나눠 봄
  const isStarting = pending || started === providerId;
  const blocked = started !== null && started !== providerId;

  return (
    <Box asChild width="full">
      <button
        type="submit"
        // 제공자 화면으로 넘어가기 전에 두 번 눌리거나 양쪽이 함께 시작하는 것을 막음
        disabled={isStarting || blocked}
        aria-busy={isStarting}
        style={{
          height: `${BUTTON_HEIGHT}px`,
          background: brand.background,
          border: brand.border,
          borderRadius: `${BUTTON_RADIUS}px`,
          padding: `0 ${EDGE_PADDING}px`,
          // 누르는 동안만 흐리게 함, SEED Box 에 투명도 prop 이 없어 style 로 줌
          // 기다리는 쪽은 더 흐리게 해 지금 도는 것이 어느 쪽인지 보이게 함
          opacity: blocked ? 0.4 : 1,
          cursor: isStarting || blocked ? "default" : "pointer",
          transition: "opacity 120ms ease",
        }}
      >
        {/* 심벌과 글자를 한 덩어리로 묶어 버튼 한가운데에 놓음 */}
        <HStack align="center" justify="center" gap="x2" width="full" height="full">
          {/* 심벌 자리에 그대로 돌려 글자 위치가 흔들리지 않음 */}
          <Symbol>
            {isStarting ? (
              <ProgressCircle size="inherit" tone="inherit" style={{ color: brand.color }} />
            ) : providerId === "kakao" ? (
              <KakaoSymbol />
            ) : (
              <GoogleSymbol />
            )}
          </Symbol>
          <Text textStyle="t4Bold" style={{ color: brand.color }}>
            {isStarting ? "연결하는 중" : LABEL[providerId]}
          </Text>
        </HStack>
      </button>
    </Box>
  );
}

/** 심벌이 놓이는 고정 폭 자리. 오른쪽은 균형을 맞추려고 비워 둠 */
function Symbol({ children }: { children?: ReactNode }) {
  return (
    <HStack
      align="center"
      justify="center"
      style={{ width: `${SYMBOL_SLOT}px`, height: `${SYMBOL_SLOT}px`, flexShrink: 0 }}
    >
      {children}
    </HStack>
  );
}

/**
 * 카카오 말풍선. 배포 이미지에서 심벌만 따로 그림
 * 말풍선은 안쪽 여백이 많은 모양이라 구글 G 와 같은 크기로 두면 눈에 작아 보여 꽉 채움
 */
function KakaoSymbol() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="rgba(0, 0, 0, 0.85)"
        d="M12 3C6.99 3 3 6.24 3 10.24c0 2.52 1.68 4.73 4.21 6.01l-.86 3.18c-.08.28.23.5.47.34l3.8-2.52c.45.05.91.08 1.38.08 5.01 0 9-3.24 9-7.09C21 6.24 17.01 3 12 3z"
      />
    </svg>
  );
}

/**
 * 구글 4색 G. 내려받은 png 가 200x204 라 정사각으로 줄이면 찌그러져 벡터로 그림
 * 네 색은 브랜드 규격이라 토큰으로 바꾸지 않음
 */
function GoogleSymbol() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
