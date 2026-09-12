"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconAndroidshareLine, IconCheckmarkCircleFill, IconPictureLine } from "@karrotmarket/react-monochrome-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "seed-design/ui/accordion";
import { ActionButton } from "seed-design/ui/action-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { Screen, ScreenBody, SectionCard } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

// 저장이 끝난 뒤 공유만 다루는 화면. 뒤로가기로 폼에 돌아가지 않게 replace 로 들어옴

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
  const snackbar = useSnackbarAdapter();
  // 클릭 안에서 fetch 를 기다리면 사파리가 공유 시트를 막으므로 미리 받아 둠
  const [card, setCard] = useState<File | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(`/r/${id}/card?ratio=story`);
        if (!response.ok) return;
        const blob = await response.blob();
        if (!alive) return;
        setCard(new File([blob], "dasijip.png", { type: blob.type || "image/png" }));
      } catch {
        // 카드를 못 받아도 링크 공유는 되므로 화면을 막지 않음
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const notify = useCallback(
    (variant: "positive" | "critical", message: string) => {
      snackbar.create({
        onClose: () => {},
        render: () => <Snackbar variant={variant} message={message} />,
      });
    },
    [snackbar],
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("positive", "링크를 복사했어요");
    } catch {
      notify("critical", "링크를 복사하지 못했어요. 주소창의 주소를 복사해 주세요");
    }
  }, [shareUrl, notify]);

  const countShare = useCallback(() => {
    // 지표용이라 실패해도 화면을 막지 않음
    void fetch(`/api/reports/${id}/share`, { method: "POST" });
  }, [id]);

  const shareCard = useCallback(async () => {
    if (!card || !navigator.canShare?.({ files: [card] })) {
      notify("critical", "이 브라우저는 이미지 공유를 지원하지 않아요. 링크로 공유해 주세요");
      return;
    }
    countShare();
    // 링크 스티커에 붙여넣을 수 있게 먼저 복사해 둠. 기다리지 않아야 공유 시트가 열림
    void navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    try {
      await navigator.share({ files: [card], title: "다시집 제보" });
    } catch {
      // 사용자가 취소하면 아무것도 하지 않음
    }
  }, [card, shareUrl, countShare, notify]);

  const shareLink = useCallback(async () => {
    countShare();
    const text = `${areaName ?? "위치 미확인"}에서 목격된 발견동물 제보예요`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "다시집 제보", text, url: shareUrl });
      } catch {
        // 사용자가 취소하면 아무것도 하지 않음
      }
      return;
    }
    await copyLink();
  }, [areaName, shareUrl, countShare, copyLink]);

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
          <ActionButton variant="brandSolid" size="large" onClick={shareCard} disabled={!card}>
            <Icon svg={<IconPictureLine />} />
            인스타그램 스토리로 공유
          </ActionButton>
          <ActionButton variant="neutralOutline" size="large" onClick={shareLink}>
            <Icon svg={<IconAndroidshareLine />} />
            다른 앱으로 공유
          </ActionButton>
          <ActionButton variant="neutralOutline" size="large" onClick={copyLink}>
            링크 복사
          </ActionButton>
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
