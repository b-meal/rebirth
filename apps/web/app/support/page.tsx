import type { Metadata } from "next";
import { Icon, VStack } from "@seed-design/react";
import { IconHeadsetLine } from "@karrotmarket/react-monochrome-icon";
import { ResultSection } from "seed-design/ui/result-section";

import { AppHeader } from "@/components/ui/app-header";
import { Screen, ScreenBody } from "@/components/ui/screen";

// 문의하기. 받는 창구와 처리 절차를 정하기 전까지는 자리만 둠
// 글을 받아 두고 답하지 못하면 기다리게 만드는 쪽이 더 나쁨

export const metadata: Metadata = {
  title: "문의하기",
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return (
    <Screen>
      <AppHeader title="문의하기" />
      <ScreenBody>
        <VStack align="stretch" justify="center" grow={1}>
          <ResultSection
            asset={
              <VStack
                align="center"
                justify="center"
                width="x16"
                height="x16"
                borderRadius="full"
                bg="bg.neutralWeak"
                mb="x5"
              >
                <Icon svg={<IconHeadsetLine />} size="x8" color="fg.neutralSubtle" />
              </VStack>
            }
            // 앱바의 뒤로가 이미 되돌아갈 길이라 버튼을 따로 두지 않음
            title="문의는 아직 준비 중이에요"
          />
        </VStack>
      </ScreenBody>
    </Screen>
  );
}
