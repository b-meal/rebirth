import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

import { AUTH_PROVIDERS, NEXT_PARAM, safeNextPath } from "@rebirth/core/auth";

import { AppHeader } from "@/components/ui/app-header";
import { Screen, ScreenBody } from "@/components/ui/screen";
import { isAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ProviderButton, ProviderButtonGroup } from "./provider-button";

// SNS 로그인 화면. 계정 만들기와 로그인을 구분하지 않음
// 제공자 목록은 core 의 AUTH_PROVIDERS 하나에서 오므로 이 화면은 제공자를 모름

export const metadata: Metadata = { title: "로그인" };

// 실패 이유별 문구. 제공자 응답 본문을 그대로 옮기지 않음
const ERROR_MESSAGES: Record<string, string> = {
  canceled: "로그인을 취소했어요",
  no_code: "로그인을 끝내지 못했어요. 다시 시도해 주세요",
  exchange_failed: "로그인을 끝내지 못했어요. 다시 시도해 주세요",
  start_failed: "지금은 연결이 어려워요. 잠시 후 다시 시도해 주세요",
  unsupported_provider: "지원하지 않는 로그인 방식이에요",
  idle_expired: "오랫동안 사용하지 않아 자동으로 로그아웃했어요",
};

/** 사용자가 잘못한 것도 고장도 아닌 안내. 빨간 톤으로 겁주지 않음 */
const INFORMATIVE_CODES = new Set(["canceled", "idle_expired"]);

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeNextPath(readParam(params[NEXT_PARAM]));
  const error = readParam(params.error);

  // 이미 로그인했으면 머무를 이유가 없음
  if (isAuthConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) redirect(next);
  }

  return (
    <Screen>
      <AppHeader title="로그인" />
      <ScreenBody justify="center" gap="x8">
        <VStack align="center" gap="x3">
          <Image src="/logo/logo-mark-512.png" alt="" width={72} height={72} priority />
          <Text as="h1" textStyle="screenTitle" color="fg.neutral" align="center">
            다시집
          </Text>
          <Text textStyle="t5Regular" color="fg.neutralMuted" align="center">
            내가 남긴 제보를 한곳에서 볼 수 있어요
          </Text>
        </VStack>

        {error ? (
          <Callout
            // 만료와 취소는 고장이 아니라 안내라 경고 톤을 씀
            tone={INFORMATIVE_CODES.has(error) ? "warning" : "critical"}
            description={ERROR_MESSAGES[error] ?? "로그인에 실패했습니다. 다시 시도해 주십시오"}
          />
        ) : null}

        {isAuthConfigured() ? (
          <ProviderButtonGroup>
            <VStack align="stretch" gap="x3">
              {AUTH_PROVIDERS.map((provider) => (
                <ProviderButton key={provider.id} provider={provider} next={next} />
              ))}
            </VStack>
          </ProviderButtonGroup>
        ) : (
          <Callout
            tone="warning"
            title="로그인을 준비하고 있어요"
            description="조금만 기다려 주세요. 로그인 없이도 제보는 남길 수 있어요"
          />
        )}

        <Text textStyle="t2Regular" color="fg.neutralSubtle" align="center">
          로그인하면 이용약관과 개인정보 처리방침에 동의하게 돼요
        </Text>
      </ScreenBody>
    </Screen>
  );
}

/** 같은 이름이 여러 번 오면 배열이라 첫 값만 씀 */
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
