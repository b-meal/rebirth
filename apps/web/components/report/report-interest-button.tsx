"use client";

import { useState } from "react";
import { PrefixIcon } from "@seed-design/react";
import { IconHeartFill, IconHeartLine } from "@karrotmarket/react-monochrome-icon";
import { ReactionButton } from "seed-design/ui/reaction-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

// 관심 표시, 계정이 없어 초안 세션 쿠키로 눌러 둔 상태를 기억함

export type ReportInterestButtonProps = {
  reportId: string;
  count: number;
  /** 이 브라우저가 이미 눌러 둔 상태 */
  mine: boolean;
};

export function ReportInterestButton({ reportId, count, mine }: ReportInterestButtonProps) {
  const snackbar = useSnackbarAdapter();
  const [pressed, setPressed] = useState(mine);
  const [total, setTotal] = useState(count);

  const toggle = async (next: boolean) => {
    // 먼저 바꿔 두고 실패하면 되돌림, 하트는 응답을 기다리면 눌린 느낌이 사라짐
    setPressed(next);
    setTotal((value) => Math.max(0, value + (next ? 1 : -1)));

    try {
      const response = await fetch(`/api/reports/${reportId}/interest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interested: next }),
      });
      if (!response.ok) throw new Error("interest");

      const body = (await response.json()) as { count?: number };
      if (typeof body.count === "number") setTotal(body.count);
    } catch {
      setPressed(!next);
      setTotal((value) => Math.max(0, value + (next ? -1 : 1)));
      snackbar.create({
        onClose: () => {},
        render: () => (
          <Snackbar variant="critical" message="관심을 저장하지 못했습니다. 잠시 후 다시 눌러 주십시오" />
        ),
      });
    }
  };

  return (
    <ReactionButton
      pressed={pressed}
      onPressedChange={(next) => void toggle(next)}
      aria-label={pressed ? "관심 해제" : "관심 표시"}
    >
      <PrefixIcon svg={pressed ? <IconHeartFill /> : <IconHeartLine />} />
      {total}
    </ReactionButton>
  );
}
