import type { Metadata } from "next";
import Link from "next/link";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { getCurrentUser } from "@/lib/auth/session";
import { SignOutButton } from "./sign-out-button";

// 계정 화면. 로그인 여부에 따라 권유와 프로필을 갈라 보여 줌
// 제보는 로그인 없이도 되므로 여기서만 계정을 요구함

export const metadata: Metadata = { title: "마이페이지" };

export default async function MinePage() {
  const user = await getCurrentUser();

  return (
    <Screen>
      <ScreenBody gap="x6">
        <Text as="h1" textStyle="screenTitle" color="fg.neutral">
          마이페이지
        </Text>

        {user ? <Profile user={user} /> : <SignInInvite />}
      </ScreenBody>
    </Screen>
  );
}

/** 로그인한 사람에게 보이는 프로필과 로그아웃 */
function Profile({ user }: { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }) {
  return (
    <>
      <HStack align="center" gap="x4">
        <Avatar
          size="64"
          src={user.avatarUrl ?? undefined}
          fallback={user.displayName?.slice(0, 1) ?? "손"}
          alt=""
        />
        <VStack align="stretch" gap="x0_5" minWidth="0">
          <Text textStyle="t6Bold" color="fg.neutral">
            {user.displayName ?? "이름 없음"}
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {PROVIDER_LABEL[user.provider]}로 로그인했습니다
          </Text>
        </VStack>
      </HStack>

      <Section>
        <SignOutButton />
      </Section>
    </>
  );
}

/** 로그인하지 않은 사람에게 보이는 권유. 제보를 막지 않았음을 함께 알림 */
function SignInInvite() {
  return (
    <Section gap="x4">
      <VStack align="stretch" gap="x2">
        <Text textStyle="t5Bold" color="fg.neutral">
          로그인하면 남긴 제보를 모아 볼 수 있습니다
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          로그인하지 않아도 제보는 그대로 보낼 수 있습니다
        </Text>
      </VStack>

      <HStack align="stretch">
        <ActionButton variant="brandSolid" size="large" flexGrow={1} asChild>
          <Link href={`${SIGN_IN_PATH}?${NEXT_PARAM}=%2Fmine`}>로그인</Link>
        </ActionButton>
      </HStack>
    </Section>
  );
}

const PROVIDER_LABEL = {
  kakao: "카카오",
  google: "구글",
} as const;
