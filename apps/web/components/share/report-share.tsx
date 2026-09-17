"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Icon, Text, VStack } from "@seed-design/react";
import { IconAndroidshareLine, IconPaperclipLine, IconPictureLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

// 제보를 공유하는 방법을 한곳에 모음. 화면마다 배치는 다르지만 동작과 문구는 같아야 함
// 인스타그램에 요청을 보내지 않음. OS 공유 시트에 파일을 넘기면 그다음은 그 앱이 함

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
};

export function useReportShare({ reportId, shareUrl, areaName }: UseReportShareInput) {
  const snackbar = useSnackbarAdapter();
  // 클릭 안에서 fetch 를 기다리면 사파리가 공유 시트를 막으므로 미리 받아 둠
  const [card, setCard] = useState<File | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(`/r/${reportId}/card?ratio=story`);
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
  }, [reportId]);

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

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("positive", "링크를 복사했어요");
    } catch {
      notify("critical", "링크를 복사하지 못했어요. 주소창의 주소를 복사해 주세요");
    }
  }, [shareUrl, notify]);

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

  return { options, cardReady: card !== null };
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
