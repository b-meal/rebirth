"use client";

import { Alert, CloseButton } from "@chakra-ui/react";
import type { ReactNode } from "react";

// WDS SectionMessage 자리. Alert 로 옮기되 호출부의 variant 이름을 그대로 받음
// 닫기 버튼은 onClose 를 넘긴 곳에만 붙음

export type SectionMessageVariant =
  | "info"
  | "negative"
  | "cautionary"
  | "positive";

const STATUS: Record<SectionMessageVariant, "info" | "error" | "warning" | "success"> = {
  info: "info",
  negative: "error",
  cautionary: "warning",
  positive: "success",
};

export type SectionMessageProps = {
  variant?: SectionMessageVariant;
  children: ReactNode;
  onClose?: () => void;
};

export function SectionMessage({
  variant = "info",
  children,
  onClose,
}: SectionMessageProps) {
  return (
    <Alert.Root status={STATUS[variant]} borderRadius="card" alignItems="flex-start">
      <Alert.Indicator />
      <Alert.Content flex="1">
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
      {onClose ? (
        <CloseButton
          size="sm"
          aria-label="닫기"
          onClick={onClose}
          alignSelf="flex-start"
        />
      ) : null}
    </Alert.Root>
  );
}
