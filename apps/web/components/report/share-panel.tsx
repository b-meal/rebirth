"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Button,
  FlexBox,
  Modal,
  ModalContainer,
  ModalContent,
  ModalHeading,
  ModalNavigation,
  ModalClose,
  SectionMessage,
  Typography,
} from "@wanteddev/wds";

export type SharePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  // 공개 상세 경로. 관리 주소를 넘기지 않음
  path: string;
};

// 서버 렌더에서는 빈 값이라 주소를 만들지 않음
const noopSubscribe = () => () => {};

type Notice = { variant: "positive" | "negative"; text: string };

export function SharePanel({ open, onOpenChange, reportId, path }: SharePanelProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const shareUrl = `${origin}${path}`;
  const cardUrl = `/api/reports/${reportId}/share-card`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setNotice({ variant: "positive", text: "주소를 복사했어요" });
    } catch (error) {
      // 사용자가 공유창을 닫은 것은 실패가 아님
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ variant: "negative", text: "아래 주소를 직접 복사해 주세요" });
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContainer variant="bottom" resize="hug">
        <ModalNavigation trailingContent={<ModalClose>닫기</ModalClose>} />

        <ModalContent sx={{ padding: "0 16px calc(16px + env(safe-area-inset-bottom))" }}>
          <ModalHeading>이 제보 공유하기</ModalHeading>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt="공유 카드 미리보기"
            loading="lazy"
            style={{
              width: "100%",
              maxHeight: 280,
              objectFit: "contain",
              borderRadius: 12,
              backgroundColor: "#f3f4f6",
            }}
          />

          <Typography variant="caption1" color="semantic.label.alternative">
            공유 파일에는 정확 위치와 관리 주소가 포함되지 않아요
          </Typography>

          <FlexBox gap="8px">
            <Button variant="outlined" color="assistive" fullWidth onClick={handleShare}>
              링크 공유
            </Button>
            <Button
              as="a"
              fullWidth
              href={cardUrl}
              download={`다시집-제보-${reportId.slice(0, 8)}.png`}
            >
              카드 저장
            </Button>
          </FlexBox>

          {notice && (
            <SectionMessage
              variant={notice.variant}
              open
              closeButton
              onOpenChange={(next) => {
                if (!next) setNotice(null);
              }}
            >
              {notice.text}
            </SectionMessage>
          )}

          <FlexBox flexDirection="column" gap="4px">
            <Typography variant="caption1" color="semantic.label.assistive">
              공개 주소
            </Typography>
            {/* 복사가 막힌 환경에서도 직접 선택해 가져갈 수 있게 둠 */}
            <Typography
              variant="caption1"
              sx={{ userSelect: "all", wordBreak: "break-all" }}
            >
              {shareUrl}
            </Typography>
          </FlexBox>
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
}
