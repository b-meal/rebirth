"use client";

import Link from "next/link";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconCheckmarkCircleFill } from "@karrotmarket/react-monochrome-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "seed-design/ui/accordion";
import { ActionButton } from "seed-design/ui/action-button";

import { useReportShare } from "@/components/share/report-share";
import { AppHeader } from "@/components/ui/app-header";
import { Screen, ScreenBody, SectionCard } from "@/components/ui/screen";

// 저장이 끝난 뒤 공유만 다루는 화면. 뒤로가기로 폼에 돌아가지 않게 replace 로 들어옴
// 그래서 헤더도 뒤로가 아니라 홈으로 두고 흐름을 여기서 끝냄
// 공유가 이 화면의 주 목적이라 시트로 감추지 않고 선택지를 그대로 펼쳐 둠

// 인스타그램은 스토리에 링크를 자동으로 붙일 수 없어 사용자가 스티커로 붙임
const STICKER_STEPS = [
  "아래 버튼으로 카드를 스토리에 올려요",
  "편집 화면에서 스티커 → 링크 를 골라요",
  "붙여넣기 하면 링크가 들어가요. 복사는 이미 됐어요",
  "글자를 제보 보기 로 바꾸면 눈에 띄어요",
];

export type ReportDoneProps = {
  id: string;
  areaName: string | null;
  shareUrl: string;
};

export function ReportDone({ id, areaName, shareUrl }: ReportDoneProps) {
  const { options, cardReady } = useReportShare({ reportId: id, shareUrl, areaName });

  return (
    <Screen>
      <AppHeader title="제보 완료" home />
      <ScreenBody gap="x6" justify="center">
        <VStack align="center" gap="x3">
          <Icon svg={<IconCheckmarkCircleFill />} size="x12" color="fg.brand" />
          <Text as="h1" textStyle="t8Bold" color="fg.neutral" align="center">
            제보가 등록됐어요
          </Text>
          <Text textStyle="t5Regular" color="fg.neutralMuted" align="center">
            같은 동네 사람이 볼수록 빨리 찾아요
          </Text>
        </VStack>

        <VStack align="stretch" gap="x2">
          {options.map((option, index) => (
            <ActionButton
              key={option.key}
              variant={index === 0 ? "brandSolid" : "neutralOutline"}
              size="large"
              disabled={option.key === "story" && !cardReady}
              onClick={option.run}
            >
              <Icon svg={option.icon} />
              {option.label}
            </ActionButton>
          ))}
        </VStack>

        <SectionCard>
          <Accordion>
            <AccordionItem value="sticker">
              <AccordionTrigger
                title="스토리에 링크 붙이는 방법"
                description="링크는 직접 붙여야 해요"
              />
              <AccordionContent>
                <VStack align="stretch" gap="x2">
                  {STICKER_STEPS.map((step, index) => (
                    <HStack key={step} gap="x2" align="flex-start">
                      <Text textStyle="t4Bold" color="fg.brand">
                        {index + 1}
                      </Text>
                      <Text textStyle="t4Regular" color="fg.neutralMuted">
                        {step}
                      </Text>
                    </HStack>
                  ))}
                  <Text textStyle="t3Regular" color="fg.neutralSubtle">
                    링크 스티커는 한 장에 하나만 붙어요
                  </Text>
                </VStack>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SectionCard>

        <ActionButton variant="ghost" size="medium" asChild>
          <Link href={`/r/${id}`}>제보 확인하기</Link>
        </ActionButton>
      </ScreenBody>
    </Screen>
  );
}
