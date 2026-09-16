"use client";

import { FLAG_REASON_LABEL, type FlagReason } from "@rebirth/types";
import { useCallback, useState } from "react";
import { Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";

// 신고 사유를 받는 시트. 발견 제보와 실종 신고가 같은 접수 경로를 씀
// 문구가 두 벌로 갈리면 한쪽만 고쳐져 말투가 어긋남

export type ReportFlagSheetProps = {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportFlagSheet({ reportId, open, onOpenChange }: ReportFlagSheetProps) {
  const [sent, setSent] = useState(false);

  const send = useCallback(
    async (reason: FlagReason) => {
      try {
        await fetch(`/api/reports/${reportId}/flag`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } catch {
        // 접수 실패도 사용자에게는 같은 안내로 닫음
      }
      setSent(true);
    },
    [reportId],
  );

  return (
    <BottomSheetRoot open={open} onOpenChange={onOpenChange}>
      {/* 접수 뒤에는 한 문장만 남아 시트가 손대기 어려울 만큼 납작해짐 */}
      <BottomSheetContent
        title={sent ? "신고를 접수했어요" : "신고 사유"}
        className={sent ? "rebirth-sheet--floor" : undefined}
      >
        <BottomSheetBody>
          {sent ? (
            <Text textStyle="t5Regular" color="fg.neutral">
              확인 후 조치해요. 접수만으로 이 기록이 바로 숨겨지지는 않아요
            </Text>
          ) : (
            <VStack align="stretch" gap="x2">
              {(Object.keys(FLAG_REASON_LABEL) as FlagReason[]).map((reason) => (
                <ActionButton
                  key={reason}
                  variant="neutralOutline"
                  size="medium"
                  onClick={() => void send(reason)}
                >
                  {FLAG_REASON_LABEL[reason]}
                </ActionButton>
              ))}
            </VStack>
          )}
        </BottomSheetBody>
        <BottomSheetFooter>
          <ActionButton
            variant="neutralOutline"
            size="large"
            onClick={() => {
              onOpenChange(false);
              setSent(false);
            }}
          >
            닫기
          </ActionButton>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
