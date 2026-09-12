import Image from "next/image";
import { Text, VStack } from "@seed-design/react";

import { HOME_PATH, SIGN_IN_PATH } from "@rebirth/core/auth";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { isAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { SplashRedirect } from "./splash-redirect";

// 진입 화면. 로그인 여부를 서버에서 판정해 목적지를 정함
// 판정을 클라이언트로 넘기면 로그인한 사람에게도 로그인 화면이 한 번 스쳐 보임
// 브랜드를 잠깐 보여 주는 자리이므로 즉시 redirect 하지 않고 화면을 그린 뒤 넘김

/** 로고를 읽을 수 있는 최소 시간. 너무 길면 진입이 느리게 느껴짐 */
const SPLASH_MS = 1200;

export default async function SplashPage() {
  const destination = await resolveDestination();

  return (
    <Screen>
      <ScreenBody justify="center" align="center" gap="x4">
        <Image
          src="/logo/logo-mark-512.png"
          alt=""
          width={96}
          height={96}
          priority
        />
        <VStack align="center" gap="x1">
          <Text as="h1" textStyle="screenTitle" color="fg.neutral">
            다시집
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted" align="center">
            길에서 만난 동물이 집으로 돌아가는 길
          </Text>
        </VStack>
      </ScreenBody>

      <SplashRedirect to={destination} delayMs={SPLASH_MS} />
    </Screen>
  );
}

/** 로그인했으면 홈, 아니면 로그인 화면 */
async function resolveDestination(): Promise<string> {
  if (!isAuthConfigured()) return HOME_PATH;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? HOME_PATH : SIGN_IN_PATH;
}
