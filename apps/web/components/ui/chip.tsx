"use client";

import { Button, type ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

// WDS Chip 자리. 고르는 칩과 읽기 전용 태그를 한 컴포넌트로 둠
// 누를 수 있는 칩은 button, 읽기 전용은 span 으로 렌더해 탭 순서에 끼지 않게 함

export type ChipSize = "xsmall" | "small" | "medium";

const SIZE: Record<ChipSize, { h: string; px: string; fontSize: string }> = {
  xsmall: { h: "24px", px: "8px", fontSize: "xs" },
  small: { h: "30px", px: "10px", fontSize: "sm" },
  medium: { h: "36px", px: "14px", fontSize: "sm" },
};

export type ChipProps = {
  children: ReactNode;
  size?: ChipSize;
  active?: boolean;
  // 읽기 전용 태그. 클릭과 포커스를 받지 않음
  readOnly?: boolean;
  outlined?: boolean;
  onClick?: () => void;
} & Omit<ButtonProps, "size" | "onClick" | "children">;

export function Chip({
  children,
  size = "medium",
  active = false,
  readOnly = false,
  outlined = false,
  onClick,
  ...rest
}: ChipProps) {
  const dimension = SIZE[size];

  return (
    <Button
      as={readOnly ? "span" : "button"}
      type={readOnly ? undefined : "button"}
      variant={active ? "solid" : outlined ? "outline" : "subtle"}
      colorPalette={active ? "brand" : "gray"}
      height={dimension.h}
      minHeight={dimension.h}
      paddingInline={dimension.px}
      fontSize={dimension.fontSize}
      fontWeight="medium"
      borderRadius="full"
      // 읽기 전용은 커서와 hover 를 죽여 누를 수 있는 것처럼 보이지 않게 함
      cursor={readOnly ? "default" : "pointer"}
      pointerEvents={readOnly ? "none" : undefined}
      tabIndex={readOnly ? -1 : undefined}
      aria-pressed={readOnly || !onClick ? undefined : active}
      onClick={readOnly ? undefined : onClick}
      {...rest}
    >
      {children}
    </Button>
  );
}
