"use client";

import { ActionButton } from "seed-design/ui/action-button";

// Cmd+P 를 모르는 보호자도 누를 수 있게 둔 자리, 인쇄본에는 screen-only 로 빠짐

export function PrintButton() {
  return (
    <ActionButton
      variant="neutralSolid"
      size="medium"
      onClick={() => window.print()}
      className="rebirth-poster-screen-only"
    >
      전단 인쇄
    </ActionButton>
  );
}
