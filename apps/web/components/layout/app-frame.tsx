"use client";

import type { ReactNode } from "react";
import { FlexBox, Typography } from "@wanteddev/wds";

// Web 은 모바일 전용. 큰 화면에서도 같은 폭의 프레임에 같은 내용을 담음
const FRAME_WIDTH = 390;
const DESKTOP = "@media (min-width: 1024px)";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <FlexBox
      justifyContent="center"
      gap="48px"
      sx={(theme) => ({
        height: "100dvh",
        [DESKTOP]: { backgroundColor: theme.semantic.background.normal.alternative },
      })}
    >
      <FlexBox
        flexDirection="column"
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          backgroundColor: theme.semantic.background.normal.normal,
          [DESKTOP]: {
            flex: "none",
            width: FRAME_WIDTH,
            borderLeft: `1px solid ${theme.semantic.line.normal.alternative}`,
            borderRight: `1px solid ${theme.semantic.line.normal.alternative}`,
          },
        })}
      >
        {children}
      </FlexBox>

      <FlexBox
        flexDirection="column"
        justifyContent="center"
        gap="12px"
        sx={{ display: "none", [DESKTOP]: { display: "flex", width: 260 } }}
      >
        <Typography variant="title3" weight="bold">
          휴대폰으로 이용해 주세요
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          사진 촬영과 위치 확인은 휴대폰에서 동작합니다. 같은 주소를 휴대폰 브라우저에
          입력하면 이어서 쓸 수 있어요.
        </Typography>
        {/* ponytail: 접속 QR 자리. DEC-01 에서 래퍼 UI 가 확정되면 채움 */}
        <Typography variant="caption1" color="semantic.label.assistive">
          관리 주소는 이 화면에 표시하지 않습니다
        </Typography>
      </FlexBox>
    </FlexBox>
  );
}
