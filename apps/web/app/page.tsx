import Link from "next/link";
import { Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import { Screen, ScreenBody } from "@/components/ui/screen";

// 길에서 휴대폰을 꺼낸 사람이 3초 안에 무엇을 하는 화면인지 알아야 하는 자리

export default function HomePage() {
  return (
    <Screen>
      <ScreenBody justify="center" gap="x6">
        <VStack align="stretch" gap="x2">
          <Text as="h1" textStyle="screenTitle" color="fg.neutral" align="center">
            다시집
          </Text>
          <Text textStyle="t5Regular" color="fg.neutralMuted" align="center">
            길에서 만난 보호자 없는 동물을 사진 한 장으로 제보합니다
          </Text>
        </VStack>

        <ActionButton variant="brandSolid" size="large" asChild>
          <Link href="/report">제보 시작하기</Link>
        </ActionButton>

        <VStack gap="x2" align="center">
          <ActionButton variant="ghost" size="small" asChild>
            <Link href="/guide/injured">다친 동물을 봤어요</Link>
          </ActionButton>
          <ActionButton variant="ghost" size="small" asChild>
            <Link href="/lost/new">반려동물을 잃어버렸어요</Link>
          </ActionButton>
        </VStack>
      </ScreenBody>
    </Screen>
  );
}
