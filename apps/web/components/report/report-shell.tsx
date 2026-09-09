"use client";

import type { ReactNode } from "react";
import { FlexBox, TopNavigation, TopNavigationButton, Typography } from "@wanteddev/wds";

// 모바일 전용 화면 셸. 큰 화면에서도 같은 폭의 모바일 프레임을 가운데 둠
const FRAME_WIDTH = 430;

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
    <FlexBox
      flexDirection="column"
      sx={(theme) => ({
        minHeight: "100dvh",
        maxWidth: FRAME_WIDTH,
        margin: "0 auto",
        backgroundColor: theme.semantic.background.normal.normal,
      })}
    >
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
        sx={{ flex: 1, overflowY: "auto", padding: "16px" }}
      >
        {children}
      </FlexBox>

      {action && (
        <FlexBox
          sx={(theme) => ({
            position: "sticky",
            bottom: 0,
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
