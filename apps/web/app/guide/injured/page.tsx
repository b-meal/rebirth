import Link from "next/link";
import { Button, Flex, Heading, Separator, Text } from "@chakra-ui/react";

import { SectionMessage } from "@/components/ui/section-message";

// 제보보다 신고가 먼저인 상황을 위한 화면
// 포획 방법, 응급처치, 약품, 먹이 안내를 넣지 않음

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
    <Flex direction="column" gap="4" padding="5" paddingBottom="24">
      <Heading size="xl">다친 동물을 봤을 때</Heading>

      <SectionMessage variant="cautionary">
        동물을 직접 잡으려 하지 마십시오. 사람과 동물 모두 위험해집니다
      </SectionMessage>

      <Flex direction="column" gap="2">
        <Heading size="md">먼저 신고해 주십시오</Heading>
        <Button asChild size="xl" colorPalette="brand" width="100%">
          <a href="tel:1577-0954">1577-0954 로 전화하기</a>
        </Button>
        <Text textStyle="sm" color="fg.alternative">
          국가동물보호정보시스템 발견 신고 번호입니다. 통화가 어려우면 관할 시·군·구
          청 당직실이나 120 에 연락할 수 있습니다
        </Text>
      </Flex>

      <Separator />

      <Flex direction="column" gap="3">
        <Heading size="md">길고양이라면</Heading>
        {CAT_BRANCHES.map((branch) => (
          <Flex key={branch.title} direction="column" gap="1">
            <Heading size="sm">{branch.title}</Heading>
            <Text color="fg.alternative">{branch.body}</Text>
          </Flex>
        ))}
      </Flex>

      <Separator />

      <Flex direction="column" gap="2">
        <Text color="fg.alternative">
          신고를 마쳤다면 목격 정보를 남겨 주십시오. 보호자가 찾고 있을 수 있습니다
        </Text>
        <Button asChild variant="outline" width="100%">
          <Link href="/report">제보 이어서 하기</Link>
        </Button>
      </Flex>
    </Flex>
  );
}
