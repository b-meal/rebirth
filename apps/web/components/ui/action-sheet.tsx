"use client";

import type { ReactNode } from "react";
import { Button, Stack } from "@chakra-ui/react";

import { BottomSheet } from "./bottom-sheet";
import { Icon, type IconName } from "./icons";

// 하단 시트에 동작 목록만 담은 형태, 삭제 같은 되돌리기 어려운 동작은 빨간 글자

export type ActionSheetAction = {
  label: ReactNode;
  icon?: IconName;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export type ActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  actions: ActionSheetAction[];
  cancelLabel?: string;
  trigger?: ReactNode;
};

export function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  actions,
  cancelLabel = "취소",
  trigger,
}: ActionSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      trigger={trigger}
    >
      <Stack gap="1">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            colorPalette="gray"
            size="xl"
            width="100%"
            justifyContent="flex-start"
            gap="3"
            paddingInline="3"
            fontWeight="medium"
            color={action.destructive ? "fg.error" : "fg.default"}
            disabled={action.disabled}
            onClick={() => {
              action.onSelect();
              onOpenChange(false);
            }}
          >
            {action.icon ? <Icon name={action.icon} size={22} /> : null}
            {action.label}
          </Button>
        ))}
        <Button
          variant="subtle"
          colorPalette="gray"
          size="xl"
          width="100%"
          marginTop="2"
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </Button>
      </Stack>
    </BottomSheet>
  );
}
