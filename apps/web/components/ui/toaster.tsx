"use client";

import { Toast, Toaster as ChakraToaster, Portal, createToaster } from "@chakra-ui/react";

// 복사·공유처럼 화면을 막지 않고 지나가는 알림
// 오류를 이걸로 알리지 않음. 사용자가 고쳐야 하는 것은 SectionMessage 로 그 자리에 남김

export const toaster = createToaster({
  // 폼 하단 버튼이 화면 아래를 차지해 위에서 띄움
  placement: "top",
  overlap: true,
  duration: 2500,
});

export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => (
          <Toast.Root width={{ md: "sm" }}>
            {toast.type === "loading" ? <Toast.Indicator /> : null}
            <Toast.Title>{toast.title}</Toast.Title>
            {toast.description ? (
              <Toast.Description>{toast.description}</Toast.Description>
            ) : null}
            {toast.closable ? <Toast.CloseTrigger /> : null}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
