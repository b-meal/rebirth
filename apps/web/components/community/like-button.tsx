"use client";

import { useState } from "react";
import { PrefixIcon } from "@seed-design/react";
import { IconHeartFill, IconHeartLine } from "@karrotmarket/react-monochrome-icon";
import { ReactionButton } from "seed-design/ui/reaction-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { toggleLike } from "@/app/community/actions";

// 공감. 계정 단위라 다른 기기에서도 같은 상태가 보임

export type LikeButtonProps = {
  postId: string;
  count: number;
  /** 이 계정이 이미 눌러 둔 상태 */
  mine: boolean;
};

export function LikeButton({ postId, count, mine }: LikeButtonProps) {
  const snackbar = useSnackbarAdapter();
  const [pressed, setPressed] = useState(mine);
  const [total, setTotal] = useState(count);

  const toggle = async (next: boolean) => {
    // 먼저 바꿔 두고 실패하면 되돌림. 하트는 응답을 기다리면 눌린 느낌이 사라짐
    setPressed(next);
    setTotal((value) => Math.max(0, value + (next ? 1 : -1)));

    try {
      const result = await toggleLike(postId);
      // 서버가 판정한 값으로 맞춤. 두 기기에서 동시에 눌러도 어긋나지 않음
      setPressed(result.liked);
      setTotal(result.count);
    } catch {
      setPressed(!next);
      setTotal((value) => Math.max(0, value + (next ? -1 : 1)));
      snackbar.create({
        onClose: () => {},
        render: () => (
          <Snackbar
            variant="critical"
            message="공감을 저장하지 못했습니다. 잠시 후 다시 눌러 주십시오"
          />
        ),
      });
    }
  };

  return (
    <ReactionButton
      pressed={pressed}
      onPressedChange={(next) => void toggle(next)}
      aria-label={pressed ? "공감 취소" : "공감하기"}
    >
      <PrefixIcon svg={pressed ? <IconHeartFill /> : <IconHeartLine />} />
      {total}
    </ReactionButton>
  );
}
