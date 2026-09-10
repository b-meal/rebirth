import Link from "next/link";
import { Divider, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

import { Screen, ScreenBody, Section } from "@/components/ui/screen";

// 제보보다 신고가 먼저인 상황을 위한 화면, 포획과 응급처치 안내는 넣지 않음

export const metadata = {
  title: "다친 동물을 봤어요",
};

const CAT_BRANCHES = [
  {
    title: "귀 끝이 잘려 있으면",
    body: "중성화를 마친 동네고양이입니다. 보호 조치가 이미 된 개체이므로 데려가지 말고 그대로 두십시오",
  },
  {
    title: "부상이 보이면",
    body: "직접 만지지 말고 아래 번호로 신고해 주십시오. 놀란 동물은 사람을 물 수 있습니다",
  },
  {
    title: "눈도 못 뜬 어린 개체면",
    body: "어미가 근처에 있을 가능성이 큽니다. 몇 시간 지켜본 뒤에도 어미가 오지 않으면 신고해 주십시오",
  },
];

export default function InjuredGuidePage() {
  return (
    <Screen>
      <ScreenBody gap="x6">
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          다친 동물을 봤을 때
        </Text>

        <Callout
          tone="warning"
          description="동물을 직접 잡으려 하지 마십시오. 사람과 동물 모두 위험해집니다"
        />

        <Section>
          <Text as="h2" textStyle="t6Bold" color="fg.neutral">
            먼저 신고해 주십시오
          </Text>
          <ActionButton variant="brandSolid" size="large" asChild>
            <a href="tel:1577-0954">1577-0954 로 전화하기</a>
          </ActionButton>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            국가동물보호정보시스템 발견 신고 번호입니다. 통화가 어려우면 관할 시군구청
            당직실이나 120 에 연락할 수 있습니다
          </Text>
        </Section>

        <Divider />

        <Section>
          <Text as="h2" textStyle="t6Bold" color="fg.neutral">
            길고양이라면
          </Text>
          {CAT_BRANCHES.map((branch) => (
            <VStack key={branch.title} align="stretch" gap="x1">
              <Text as="h3" textStyle="t5Bold" color="fg.neutral">
                {branch.title}
              </Text>
              <Text textStyle="t4Regular" color="fg.neutralMuted">
                {branch.body}
              </Text>
            </VStack>
          ))}
        </Section>

        <Divider />

        <Section>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            신고를 마쳤다면 목격 정보를 남겨 주십시오. 보호자가 찾고 있을 수 있습니다
          </Text>
          <ActionButton variant="neutralOutline" size="large" asChild>
            <Link href="/report">제보 이어서 하기</Link>
          </ActionButton>
        </Section>
      </ScreenBody>
    </Screen>
  );
}
