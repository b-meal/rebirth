"use client";

// design-system-allow:color,space,radius,raw-element 제공자 브랜드 가이드라인이 정한 고정값

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Box, HStack, Text } from "@seed-design/react";

import { NEXT_PARAM, type ProviderDescriptor } from "@rebirth/core/auth";

import { signInWithProvider } from "./actions";

// 카카오는 개발자센터가 배포한 버튼 이미지를 그대로 쓰고 구글은 규격을 맞춰 그림

// 두 버튼 높이를 맞춰 세로로 놓았을 때 어긋나지 않게 함
const BUTTON_HEIGHT = 48;

const GOOGLE = {
  background: "#FFFFFF",
  border: "1px solid #747775",
  color: "#1F1F1F",
  borderRadius: 4,
} as const;

type Props = {
  provider: ProviderDescriptor;
  next: string;
};

export function ProviderButton({ provider, next }: Props) {
  return (
    <form action={signInWithProvider}>
      <input type="hidden" name="provider" value={provider.id} />
      <input type="hidden" name={NEXT_PARAM} value={next} />
      <SubmitButton providerId={provider.id} />
    </form>
  );
}

/** useFormStatus 는 form 안에서만 값을 읽으므로 버튼을 따로 둠 */
function SubmitButton({ providerId }: { providerId: ProviderDescriptor["id"] }) {
  const { pending } = useFormStatus();
  const label = providerId === "kakao" ? "카카오 로그인" : "Google 계정으로 로그인";

  return (
    <Box asChild width="full" height={`${BUTTON_HEIGHT}px`}>
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        // 누르는 동안만 흐리게 함, SEED Box 에 투명도 prop 이 없어 style 로 줌
        style={{ opacity: pending ? 0.6 : 1 }}
      >
        {providerId === "kakao" ? <KakaoFace /> : <GoogleFace label={label} />}
      </button>
    </Box>
  );
}

/** 카카오는 색과 문구를 고치지 못하게 되어 있어 배포된 버튼 이미지를 그대로 씀 */
function KakaoFace() {
  return (
    <Image
      src="/brand/kakao-login-wide.png"
      alt="카카오 로그인"
      width={600}
      height={90}
      priority
      style={{ width: "100%", height: `${BUTTON_HEIGHT}px`, objectFit: "contain" }}
    />
  );
}

/** 구글은 흰 바탕과 회색 테두리, 로고 20px 규격을 그대로 맞춤 */
function GoogleFace({ label }: { label: string }) {
  return (
    <HStack
      align="center"
      justify="center"
      gap="x2"
      width="full"
      height="full"
      style={{
        background: GOOGLE.background,
        border: GOOGLE.border,
        borderRadius: `${GOOGLE.borderRadius}px`,
      }}
    >
      <Image src="/brand/google-logo.png" alt="" width={20} height={20} />
      <Text textStyle="t4Bold" style={{ color: GOOGLE.color }}>
        {label}
      </Text>
    </HStack>
  );
}
