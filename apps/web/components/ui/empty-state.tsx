"use client";

import { EmptyState as ChakraEmptyState } from "@chakra-ui/react";
import type { ReactNode } from "react";

// 결과가 없는 화면. 비어 있음과 고장을 구분해 보여주려고 둠
// 오류는 SectionMessage 로 감. 여기는 정상인데 아직 아무것도 없는 상태만 씀

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  // 다음 행동이 있으면 버튼을 받음
  action?: ReactNode;
  // 목록 안에 끼울 때는 sm 으로 줄임
  size?: "sm" | "md";
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = "md",
}: EmptyStateProps) {
  return (
    <ChakraEmptyState.Root size={size}>
      <ChakraEmptyState.Content>
        {icon ? (
          <ChakraEmptyState.Indicator color="fg.assistive">
            {icon}
          </ChakraEmptyState.Indicator>
        ) : null}
        <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
        {description ? (
          <ChakraEmptyState.Description>{description}</ChakraEmptyState.Description>
        ) : null}
        {action}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  );
}
