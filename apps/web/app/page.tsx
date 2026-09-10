import Link from "next/link";
import { Button, Flex, Heading, Text } from "@chakra-ui/react";

// 길에서 휴대폰을 꺼낸 사람이 3초 안에 무엇을 하는 화면인지 알아야 함
// 최근 제보 미리보기나 통계를 넣지 않음. 선택지를 늘리면 30초 목표가 무너짐

export default function HomePage() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      minHeight="100dvh"
      padding="6"
      textAlign="center"
    >
      <Heading size="2xl">다시집</Heading>
      <Text marginBottom="4" color="fg.alternative">
        길에서 만난 보호자 없는 동물을 사진 한 장으로 제보합니다
      </Text>

      <Button asChild size="xl" colorPalette="brand" width="100%" maxWidth="320px">
        <Link href="/report">제보 시작하기</Link>
      </Button>

      <Flex direction="column" gap="2" marginTop="4">
        <Link href="/guide/injured">
          <Text textStyle="bodySm" color="fg.alternative" textDecoration="underline">
            다친 동물을 봤어요
          </Text>
        </Link>
        <Link href="/lost/new">
          <Text textStyle="bodySm" color="fg.alternative" textDecoration="underline">
            반려동물을 잃어버렸어요
          </Text>
        </Link>
      </Flex>
    </Flex>
  );
}
