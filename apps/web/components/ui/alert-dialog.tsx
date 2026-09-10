"use client";

import type { ReactNode } from "react";
import { Button, Dialog, Portal } from "@chakra-ui/react";

import { FRAME_INSET } from "./screen";

// 확인이 필요한 결정을 가운데 작은 창으로 묻는 대화상자, 선택지는 최대 둘

export type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  /** null 이면 취소 버튼 없이 확인만 */
  cancelLabel?: string | null;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  trigger?: ReactNode;
};

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  destructive = false,
  loading = false,
  onConfirm,
  trigger,
}: AlertDialogProps) {
  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="center"
      motionPreset="scale"
    >
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner insetInline={FRAME_INSET} padding="screen">
          <Dialog.Content
            width="100%"
            maxWidth="320px"
            borderRadius="sheet"
            backgroundColor="bg.panel"
            boxShadow="float"
          >
            <Dialog.Header paddingInline="6" paddingTop="7" paddingBottom="2" justifyContent="center">
              <Dialog.Title textStyle="title3" textAlign="center">
                {title}
              </Dialog.Title>
            </Dialog.Header>
            {description ? (
              <Dialog.Body paddingInline="6" paddingTop="0" paddingBottom="2">
                <Dialog.Description textStyle="bodySm" color="fg.alternative" textAlign="center">
                  {description}
                </Dialog.Description>
              </Dialog.Body>
            ) : null}
            <Dialog.Footer paddingInline="5" paddingTop="4" paddingBottom="5" gap="2">
              {cancelLabel !== null ? (
                <Button
                  flex="1"
                  variant="subtle"
                  colorPalette="gray"
                  disabled={loading}
                  onClick={() => onOpenChange(false)}
                >
                  {cancelLabel}
                </Button>
              ) : null}
              <Button
                flex="1"
                colorPalette={destructive ? "red" : "brand"}
                loading={loading}
                onClick={() => void onConfirm()}
              >
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
