"use client";

import type { ReactNode } from "react";
import { Box, CloseButton, Drawer, Flex, Portal } from "@chakra-ui/react";

import { FRAME_INSET } from "./screen";

// 아래에서 올라오는 시트, 선택지와 짧은 폼을 화면을 떠나지 않고 처리

export type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 시트를 여는 버튼, 넘기면 Trigger 로 감싸서 렌더 */
  trigger?: ReactNode;
  handle?: boolean;
  closeButton?: boolean;
  maxHeight?: string;
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  handle = true,
  closeButton = false,
  maxHeight = "85dvh",
}: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="bottom"
    >
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner insetInline={FRAME_INSET}>
          <Drawer.Content
            width="100%"
            maxWidth="100%"
            maxHeight={maxHeight}
            borderTopRadius="sheet"
            backgroundColor="bg.panel"
            boxShadow="overlay"
            paddingBottom="safeBottom"
          >
            {handle ? (
              <Flex justify="center" paddingTop="2.5" paddingBottom="1">
                <Box width="handle" height="4px" borderRadius="full" backgroundColor="border.emphasized" />
              </Flex>
            ) : null}

            {title || description || closeButton ? (
              <Drawer.Header
                display="flex"
                flexDirection="column"
                alignItems="stretch"
                gap="1"
                paddingInline="screen"
                paddingTop={handle ? "2" : "5"}
                paddingBottom="2"
              >
                <Flex justify="space-between" align="flex-start" gap="3">
                  {title ? <Drawer.Title textStyle="title3">{title}</Drawer.Title> : <Box />}
                  {closeButton ? (
                    <Drawer.CloseTrigger asChild position="static">
                      <CloseButton size="sm" aria-label="닫기" marginTop="-1" marginInlineEnd="-1" />
                    </Drawer.CloseTrigger>
                  ) : null}
                </Flex>
                {description ? (
                  <Drawer.Description textStyle="bodySm" color="fg.alternative">
                    {description}
                  </Drawer.Description>
                ) : null}
              </Drawer.Header>
            ) : null}

            <Drawer.Body paddingInline="screen" paddingTop={title ? "2" : "3"} paddingBottom="4">
              {children}
            </Drawer.Body>

            {footer ? (
              <Drawer.Footer paddingInline="screen" paddingTop="0" paddingBottom="4" gap="2">
                {footer}
              </Drawer.Footer>
            ) : null}
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
