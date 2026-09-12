import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";

import { AUTH_PROVIDERS, NEXT_PARAM, safeNextPath } from "@rebirth/core/auth";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { isAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ProviderButton } from "./provider-button";

// SNS 로그인 화면. 계정 만들기와 로그인을 구분하지 않음
// 제공자 목록은 core 의 AUTH_PROVIDERS 하나에서 오므로 이 화면은 제공자를 모름

export const metadata: Metadata = { title: "로그인" };

// 실패 이유별 문구. 제공자 응답 본문을 그대로 옮기지 않음
const ERROR_MESSAGES: Record<string, string> = {
  canceled: "로그인을 취소했습니다. 다시 시도해 주십시오",
  no_code: "로그인 응답이 올바르지 않습니다. 다시 시도해 주십시오",
  exchange_failed: "로그인을 마치지 못했습니다. 다시 시도해 주십시오",
  start_failed: "로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주십시오",
  unsupported_provider: "지원하지 않는 로그인 방식입니다",
};

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
      <ScreenBody justify="center" gap="x8">
        <VStack align="stretch" gap="x2">
          <Text as="h1" textStyle="screenTitle" color="fg.neutral" align="center">
            다시집
          </Text>
          <Text textStyle="t5Regular" color="fg.neutralMuted" align="center">
            로그인하면 내가 남긴 제보를 한곳에서 볼 수 있습니다
          </Text>
        </VStack>

        {error ? (
          <Callout
            tone="critical"
            description={ERROR_MESSAGES[error] ?? "로그인에 실패했습니다. 다시 시도해 주십시오"}
          />
        ) : null}

        {isAuthConfigured() ? (
          <VStack align="stretch" gap="x3">
            {AUTH_PROVIDERS.map((provider) => (
              <ProviderButton key={provider.id} provider={provider} next={next} />
            ))}
          </VStack>
        ) : (
          <Callout
            tone="warning"
            title="로그인을 준비하고 있습니다"
            description="SNS 로그인 설정이 아직 끝나지 않았습니다"
          />
        )}

        <Text textStyle="t2Regular" color="fg.neutralSubtle" align="center">
          로그인하면 서비스 이용약관과 개인정보 처리방침에 동의한 것으로 봅니다
        </Text>
      </ScreenBody>
    </Screen>
  );
}

/** 같은 이름이 여러 번 오면 배열이라 첫 값만 씀 */
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
