import Link from "next/link";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconCheckmarkLine,
  IconLocationpinLine,
  IconPawprintLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "seed-design/ui/accordion";

import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

// 급한 사람이 읽는 화면이라 순서를 상황에 맞춤
// 만지지 말 것 → 어디에 전화할 것 → 기다리는 동안 → 흔한 오해 순서
// 포획과 응급처치 방법은 넣지 않음. 비전문가가 따라 하면 동물과 사람이 함께 다침

export const metadata = {
  title: "다친 동물을 봤어요",
};

/**
 * 종류별 신고처
 * 개·고양이는 농식품부, 야생동물은 환경 부서로 소관이 갈려 한 번호로 묶을 수 없음
 */
const WHERE_TO_CALL = [
  {
    id: "abandoned",
    icon: <IconPawprintLine />,
    label: "개 · 고양이",
    phone: "1577-0954",
    phoneHref: "tel:1577-0954",
    caption: "동물보호 상담센터",
    // 2026년 3월부터 이 번호가 발견 신고를 받아 관할 지자체로 연결함
    body: "상담원이 발견 위치를 확인해 관할 지자체 담당자에게 연결해 줍니다. 전화 운영 시간은 안내에 따라 다를 수 있습니다",
  },
  {
    id: "wild",
    icon: <IconLocationpinLine />,
    label: "야생동물",
    phone: "지역 야생동물구조센터",
    phoneHref: "https://www.animal.go.kr",
    caption: "고라니 · 너구리 · 새 등",
    body: "야생동물은 담당 부서가 달라 시도별 구조관리센터로 연락해야 합니다. 야간과 공휴일에는 관할 구청 당직실로 안내받을 수 있습니다",
  },
];

/** 전화보다 온라인이 편한 경우를 위한 갈래 */
const ONLINE_ROUTES = [
  {
    label: "국가동물보호정보시스템",
    value: "animal.go.kr",
    href: "https://www.animal.go.kr",
    body: "발견 신고를 24시간 접수합니다. 사진을 함께 올려야 합니다",
  },
  {
    label: "지자체 콜센터",
    value: "지역번호 + 120",
    body: "같은 지역에서는 국번 없이 120 을 누릅니다",
  },
];

/**
 * 자주 어긋나는 판단
 * 잘못 알고 한 행동이 되돌리기 어려워 오해를 먼저 풀어 줌
 */
const MISTAKES = [
  {
    id: "ear",
    question: "귀 끝이 잘린 고양이를 봤어요",
    answer:
      "중성화 수술을 마쳤다는 표시입니다. 규정은 왼쪽 귀 끝 1센티미터를 잘라 두도록 하고 있지만 반대쪽인 경우도 있습니다. 이미 중성화된 개체라 포획 대상이 아니니 그대로 두십시오. 다만 다쳤다면 귀 모양과 상관없이 신고해 주십시오",
  },
  {
    id: "kitten",
    question: "눈도 못 뜬 새끼 고양이가 혼자 있어요",
    answer:
      "어미가 먹이를 구하러 나갔을 수 있습니다. 동물권행동 카라는 어미가 두세 시간, 길게는 반나절까지 자리를 비우기도 한다고 안내합니다. 멀리 떨어져 지켜봐 주십시오. 사람 냄새가 묻으면 어미가 돌보지 않을 수 있어 만지지 않는 편이 좋습니다. 다만 비에 젖었거나 차도에 있거나 눈에 띄게 아파 보이면 기다리지 말고 신고해 주십시오",
  },
  {
    id: "119",
    question: "119 를 부르면 되나요",
    answer:
      "사람이 위험한 상황이 아니면 출동하지 않을 수 있습니다. 들개가 사람을 위협하거나 도로에서 사고가 날 수 있는 상황은 119 로 신고합니다. 동물만 위험한 상황은 위 번호로 연락해 주십시오",
  },
  {
    id: "stray",
    question: "길고양이도 구조 신고 대상인가요",
    answer:
      "동네에서 자생하는 길고양이는 법에서 구조와 보호조치 대상에서 빼 두었습니다. 대신 중성화 사업으로 관리합니다. 다치거나 사고를 당한 경우에는 신고할 수 있습니다",
  },
  {
    id: "take",
    question: "일단 데려가서 병원에 가면 안 되나요",
    answer:
      "다친 동물을 옮기면 상태가 나빠질 수 있고 놀란 동물은 사람을 뭅니다. 직접 데려가더라도 신고 절차를 거쳐 동물보호센터에 인계해야 합니다. 먼저 전화로 안내를 받아 주십시오",
  },
];

function CallCard({ item }: { item: (typeof WHERE_TO_CALL)[number] }) {
  const external = item.phoneHref.startsWith("http");

  return (
    <VStack
      align="stretch"
      gap="x2"
      p="x4"
      borderRadius="r3"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.layerDefault"
    >
      <HStack gap="x2" align="center">
        <Icon svg={item.icon} color="fg.neutralMuted" />
        <Text textStyle="t5Bold" color="fg.neutral">
          {item.label}
        </Text>
      </HStack>

      <ActionButton variant={external ? "neutralOutline" : "brandSolid"} size="large" asChild>
        <a
          href={item.phoneHref}
          {...(external && { target: "_blank", rel: "noreferrer" })}
        >
          {external ? item.phone : `${item.phone} 전화하기`}
        </a>
      </ActionButton>

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        {item.caption}
      </Text>
      <Text textStyle="t3Regular" color="fg.neutralMuted">
        {item.body}
      </Text>
    </VStack>
  );
}

export default function InjuredGuidePage() {
  return (
    <Screen>
      <AppHeader title="응급 대처 가이드" />
      <ScreenBody gap="x6">
        <VStack align="stretch" gap="x2">
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            다친 동물을 봤을 때
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            구조는 지자체가 맡습니다. 다시집은 신고를 대신 접수하지 않습니다
          </Text>
        </VStack>

        {/* 만지지 말라는 말이 가장 먼저 보여야 함. 이 한 줄이 사고를 막음 */}
        <Callout
          tone="critical"
          title="먼저, 손대지 마십시오"
          description="놀란 동물은 사람을 뭅니다. 옮기면 상태가 더 나빠질 수 있습니다"
        />

        <Section gap="x3">
          <VStack align="stretch" gap="x1">
            <Text as="h2" textStyle="t6Bold" color="fg.neutral">
              어디에 연락할까요
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              동물 종류에 따라 담당하는 곳이 다릅니다
            </Text>
          </VStack>

          {WHERE_TO_CALL.map((item) => (
            <CallCard key={item.id} item={item} />
          ))}
        </Section>

        <Section gap="x3">
          <Text as="h2" textStyle="t6Bold" color="fg.neutral">
            전화가 어렵다면
          </Text>

          <VStack align="stretch" gap="x2">
            {ONLINE_ROUTES.map((route) => (
              <VStack
                key={route.label}
                align="stretch"
                gap="x1"
                p="x4"
                borderRadius="r3"
                bg="bg.neutralWeak"
              >
                <HStack justify="space-between" align="center" gap="x2">
                  <Text textStyle="t4Bold" color="fg.neutral">
                    {route.label}
                  </Text>
                  {route.href ? (
                    <Box asChild>
                      <a href={route.href} target="_blank" rel="noreferrer">
                        <Text textStyle="t3Bold" color="fg.brand">
                          {route.value}
                        </Text>
                      </a>
                    </Box>
                  ) : (
                    <Text textStyle="t3Bold" color="fg.neutralMuted">
                      {route.value}
                    </Text>
                  )}
                </HStack>
                <Text textStyle="t3Regular" color="fg.neutralMuted">
                  {route.body}
                </Text>
              </VStack>
            ))}
          </VStack>
        </Section>

        <Section gap="x3">
          <VStack align="stretch" gap="x1">
            <Text as="h2" textStyle="t6Bold" color="fg.neutral">
              기다리는 동안
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              신고할 때 이 세 가지를 말해 주면 빠릅니다
            </Text>
          </VStack>

          <VStack align="stretch" gap="x2">
            {[
              { label: "어디에서", body: "건물 이름이나 눈에 띄는 표지물" },
              { label: "어떤 동물이", body: "개인지 고양이인지, 크기와 털색" },
              { label: "어떤 상태인지", body: "움직이는지, 어디를 다친 것 같은지" },
            ].map((row, index) => (
              <HStack key={row.label} gap="x3" align="flex-start">
                <Box
                  minWidth="x6"
                  height="x6"
                  borderRadius="full"
                  bg="bg.neutralWeak"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text textStyle="t2Bold" color="fg.neutralMuted">
                    {index + 1}
                  </Text>
                </Box>
                <VStack align="stretch" gap="x0_5" minWidth="0">
                  <Text textStyle="t4Bold" color="fg.neutral">
                    {row.label}
                  </Text>
                  <Text textStyle="t3Regular" color="fg.neutralMuted">
                    {row.body}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>

          <Callout
            tone="informative"
            description="멀리서 사진을 찍어 두면 신고할 때도, 제보할 때도 그대로 쓸 수 있습니다"
          />
        </Section>

        <Section gap="x3">
          <Text as="h2" textStyle="t6Bold" color="fg.neutral">
            이런 것이 궁금하실 겁니다
          </Text>

          {/* 급한 사람이 스크롤을 덜 하도록 접어 둠 */}
          <Accordion multiple>
            {MISTAKES.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger title={item.question} headingLevel={3} />
                <AccordionContent>
                  <Text textStyle="t4Regular" color="fg.neutralMuted">
                    {item.answer}
                  </Text>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        <Section gap="x3">
          <VStack align="stretch" gap="x1">
            <HStack gap="x2" align="center">
              <Icon svg={<IconCheckmarkLine />} color="fg.neutralMuted" />
              <Text as="h2" textStyle="t6Bold" color="fg.neutral">
                신고를 마치셨다면
              </Text>
            </HStack>
            <Text textStyle="t4Regular" color="fg.neutralMuted">
              목격한 자리를 남겨 주십시오. 보호자가 찾고 있을 수 있습니다
            </Text>
          </VStack>

          <ActionButton variant="neutralOutline" size="large" asChild>
            <Link href="/report">발견 제보 남기기</Link>
          </ActionButton>
        </Section>

        <Text textStyle="t2Regular" color="fg.neutralSubtle">
          이 안내는 공공기관이 공개한 자료를 정리한 것입니다. 실제 처리 방법은 지역과 상황에
          따라 다를 수 있으니 담당 기관의 안내를 따라 주십시오
        </Text>
      </ScreenBody>
    </Screen>
  );
}
