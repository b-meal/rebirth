"use client";

import type { ReactNode } from "react";
import { FlexBox, TopNavigation, TopNavigationButton, Typography } from "@wanteddev/wds";

export type ReportShellProps = {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  // 하단에 고정하는 주 행동. 없으면 영역 자체를 그리지 않음
  action?: ReactNode;
  children: ReactNode;
};

export function ReportShell({ title, onBack, onClose, action, children }: ReportShellProps) {
  return (
    // 헤더와 하단은 자리를 지키고 본문만 스크롤함
    <FlexBox flexDirection="column" sx={{ flex: 1, height: "100%", minHeight: 0 }}>
      <TopNavigation
        background
        leadingContent={
          onBack && (
            <TopNavigationButton variant="text" color="assistive" onClick={onBack}>
              뒤로
            </TopNavigationButton>
          )
        }
        trailingContent={
          onClose && (
            <TopNavigationButton variant="text" color="assistive" onClick={onClose}>
              닫기
            </TopNavigationButton>
          )
        }
      >
        <Typography variant="body1" weight="bold">
          {title}
        </Typography>
      </TopNavigation>

      <FlexBox
        flexDirection="column"
        gap="20px"
        // minHeight 0 이 없으면 flex 항목이 내용만큼 늘어나 안쪽 스크롤이 생기지 않음
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px" }}
      >
        {children}
      </FlexBox>

      {action && (
        <FlexBox
          sx={(theme) => ({
            flex: "none",
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
            borderTop: `1px solid ${theme.semantic.line.normal.alternative}`,
            backgroundColor: theme.semantic.background.normal.normal,
          })}
        >
          {action}
        </FlexBox>
      )}
    </FlexBox>
  );
}
