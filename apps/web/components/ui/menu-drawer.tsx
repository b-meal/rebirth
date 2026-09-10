"use client";

import type { ReactNode } from "react";
import { Box, CloseButton, Drawer, Flex, Portal, Text } from "@chakra-ui/react";

import { ListGroup, ListItem } from "./list-item";
import { FRAME_COLUMN } from "./screen";
import type { IconName } from "./icons";

// 햄버거로 여는 옆 메뉴, 항목은 ListItem 행으로 통일하고 프레임 안에서만 열림

export type MenuDrawerItem = {
  label: ReactNode;
  href?: string;
  icon?: IconName;
  onSelect?: () => void;
  trailing?: ReactNode;
  active?: boolean;
};

export type MenuDrawerGroup = {
  title?: ReactNode;
  items: MenuDrawerItem[];
};

export type MenuDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  /** 제목 자리에 통째로 넣는 프로필 같은 머리 */
  header?: ReactNode;
  groups: MenuDrawerGroup[];
  footer?: ReactNode;
  placement?: "start" | "end";
  trigger?: ReactNode;
};

export function MenuDrawer({
  open,
  onOpenChange,
  title,
  header,
  groups,
  footer,
  placement = "start",
  trigger,
}: MenuDrawerProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement={placement}
      size="xs"
    >
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Portal>
        <Drawer.Backdrop />
        {/* 옆 메뉴는 폰 프레임의 가장자리에 붙어야 해 Positioner 를 프레임 폭으로 둠 */}
        <Drawer.Positioner {...FRAME_COLUMN}>
          <Drawer.Content
            width="82%"
            maxWidth="320px"
            backgroundColor="bg.panel"
            paddingTop="safeTop"
            paddingBottom="safeBottom"
          >
            <Drawer.Header paddingInline="screen" paddingTop="4" paddingBottom="3">
              <Flex justify="space-between" align="center" gap="3" width="100%">
                {header ?? (
                  <Drawer.Title textStyle="title3">{title}</Drawer.Title>
                )}
                <Drawer.CloseTrigger asChild position="static">
                  <CloseButton size="sm" aria-label="닫기" marginInlineEnd="-2" />
                </Drawer.CloseTrigger>
              </Flex>
            </Drawer.Header>

            <Drawer.Body padding="0" display="flex" flexDirection="column" gap="4">
              {groups.map((group, index) => (
                <ListGroup key={index} title={group.title} divider={false}>
                  {group.items.map((item, itemIndex) => (
                    <Box
                      key={itemIndex}
                      backgroundColor={item.active ? "brand.subtle" : undefined}
                      css={
                        item.active
                          ? { "& [data-title]": { fontWeight: 600 } }
                          : undefined
                      }
                    >
                      <ListItem
                        leading={item.icon}
                        title={<Text as="span" data-title>{item.label}</Text>}
                        trailing={item.trailing}
                        href={item.href}
                        onClick={
                          item.onSelect
                            ? () => {
                                item.onSelect?.();
                                onOpenChange(false);
                              }
                            : item.href
                              ? undefined
                              : () => onOpenChange(false)
                        }
                      />
                    </Box>
                  ))}
                </ListGroup>
              ))}
            </Drawer.Body>

            {footer ? (
              <Drawer.Footer paddingInline="screen" paddingBlock="4" justifyContent="flex-start">
                {footer}
              </Drawer.Footer>
            ) : null}
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
