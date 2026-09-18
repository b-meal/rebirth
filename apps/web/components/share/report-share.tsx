"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, Text, VStack } from "@seed-design/react";
import { IconAndroidshareLine, IconPaperclipLine, IconPictureLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { withObject } from "@/lib/report-label";

// 배치는 달라도 동작과 문구가 같아야 하는 공유 경로, OS 공유 시트에 파일만 넘김

export type ShareOption = {
  key: string;
  label: string;
  description: string;
  icon: ReactNode;
  run: () => void;
};

export type UseReportShareInput = {
  reportId: string;
  shareUrl: string;
  areaName: string | null;
  /** 실종과 발견은 공유 문구가 다름, 생략하면 발견 쪽 문구 */
  kind?: "lost" | "sighting";
  /** 보호자가 적어 둔 이름, 있으면 이름으로 부름 */
  petName?: string | null;
  /** 공유가 주 동작인 화면만 참, 상세는 시트를 열 때 armCard 로 부름 */
  prefetch?: boolean;
};

/** 내려받기 갈래, 파일 공유 시트가 없는 데스크톱에서만 씀 */
function downloadCard(file: File): boolean {
  try {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    // 즉시 해제하면 사파리가 내려받기를 시작하기 전에 주소가 사라짐
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}

export function useReportShare({
  reportId,
  shareUrl,
  areaName,
  kind = "sighting",
  petName = null,
  prefetch = true,
}: UseReportShareInput) {
  const snackbar = useSnackbarAdapter();
  // 클릭 안에서 fetch 를 기다리면 사파리가 공유 시트를 막으므로 미리 받아 둠
  const [card, setCard] = useState<File | null>(null);
  const armed = useRef(false);

  // 상세를 열기만 한 사람에게 카드 렌더를 돌리지 않는 비용 절감
  const armCard = useCallback(() => {
    if (armed.current) return;
    armed.current = true;
    void (async () => {
      try {
        const response = await fetch(`/r/${reportId}/card?ratio=story`);
        if (!response.ok) return;
        const blob = await response.blob();
        setCard(new File([blob], "dasijip.png", { type: blob.type || "image/png" }));
      } catch {
        // 카드를 못 받아도 링크 공유는 되므로 화면을 막지 않음
      }
    })();
  }, [reportId]);

  useEffect(() => {
    // 공유가 주 동작인 화면만 첫 그림에서 바로 받아 둠
    if (prefetch) armCard();
  }, [prefetch, armCard]);

  const notify = useCallback(
    (variant: "positive" | "critical", message: string) => {
      snackbar.create({
        onClose: () => {},
        render: () => <Snackbar variant={variant} message={message} />,
      });
    },
    [snackbar],
  );

  const countShare = useCallback(() => {
    // 지표용이라 실패해도 화면을 막지 않음
    void fetch(`/api/reports/${reportId}/share`, { method: "POST" });
  }, [reportId]);

  // 실종은 보호자가 주인공이라 이름을 아는 신고를 이름으로 부름
  const shareTitle = kind === "lost" ? "다시집 실종 신고" : "다시집 제보";
  const where = areaName ?? "위치 미확인";
  const shareText =
    kind === "lost"
      ? petName
        ? `${where}에서 ${withObject(petName)} 찾고 있어요`
        : `${where}에서 반려동물을 찾고 있어요`
      : `${where}에서 목격된 발견동물 제보예요`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("positive", "링크를 복사했어요");
    } catch {
      notify("critical", "링크를 복사하지 못했어요. 주소창의 주소를 복사해 주세요");
    }
  }, [shareUrl, notify]);

  const shareCard = useCallback(async () => {
    if (card && navigator.canShare?.({ files: [card] })) {
      countShare();
      // 링크 스티커에 붙여넣게 먼저 복사, 기다리면 공유 시트가 막힘
      void navigator.clipboard.writeText(shareUrl).catch(() => undefined);
      try {
        await navigator.share({ files: [card], title: shareTitle });
      } catch {
        // 사용자가 취소하면 아무것도 하지 않음
      }
      return;
    }
    // 데스크톱은 파일 공유 시트가 없어 카드를 내려 주고 올리는 일은 사람에게 맡김
    if (card && downloadCard(card)) {
      countShare();
      void navigator.clipboard.writeText(shareUrl).catch(() => undefined);
      notify("positive", "내려받은 카드를 인스타그램에 올려 주세요, 링크는 복사해 뒀어요");
      return;
    }
    notify("critical", "이 브라우저는 이미지 공유를 지원하지 않아요. 링크로 공유해 주세요");
  }, [card, shareUrl, shareTitle, countShare, notify]);

  const shareLink = useCallback(async () => {
    countShare();
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch {
        // 사용자가 취소하면 아무것도 하지 않음
      }
      return;
    }
    await copyLink();
  }, [shareTitle, shareText, shareUrl, countShare, copyLink]);

  const options: ShareOption[] = [
    {
      key: "story",
      label: "인스타그램 스토리로 공유",
      description: "카드 이미지를 스토리에 올려요",
      icon: <IconPictureLine />,
      run: () => void shareCard(),
    },
    {
      key: "apps",
      label: "다른 앱으로 공유",
      description: "카카오톡, 문자 등으로 링크를 보내요",
      icon: <IconAndroidshareLine />,
      run: () => void shareLink(),
    },
    {
      key: "copy",
      label: "링크 복사",
      description: "주소를 복사해 어디든 붙여넣어요",
      icon: <IconPaperclipLine />,
      run: () => void copyLink(),
    },
  ];

  return { options, cardReady: card !== null, armCard };
}

export type ReportShareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ShareOption[];
  cardReady: boolean;
};

/** 상세처럼 공유가 주 동작이 아닌 화면에서 쓰는 시트 */
export function ReportShareSheet({
  open,
  onOpenChange,
  options,
  cardReady,
}: ReportShareSheetProps) {
  return (
    <BottomSheetRoot open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent title="제보 공유하기">
        <BottomSheetBody>
          <VStack align="stretch" gap="x2" pb="x5">
            {options.map((option) => (
              <ActionButton
                key={option.key}
                variant="neutralWeak"
                size="large"
                disabled={option.key === "story" && !cardReady}
                onClick={() => {
                  option.run();
                  onOpenChange(false);
                }}
              >
                <Icon svg={option.icon} />
                {option.label}
              </ActionButton>
            ))}
            <Text textStyle="t3Regular" color="fg.neutralSubtle" align="center">
              같은 동네 사람이 볼수록 빨리 찾아요
            </Text>
          </VStack>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
