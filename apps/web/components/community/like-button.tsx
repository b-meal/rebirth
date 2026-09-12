"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
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

type Like = { pressed: boolean; total: number };

export function LikeButton({ postId, count, mine }: LikeButtonProps) {
  const snackbar = useSnackbarAdapter();
  // 서버가 판정한 값. 화면을 새로 내려받지 않으므로 응답으로만 바뀜
  const [saved, setSaved] = useState<Like>({ pressed: mine, total: count });
  // 누르는 즉시 보여 줄 값. 하트는 응답을 기다리면 눌린 느낌이 사라짐
  const [shown, showNext] = useOptimistic(saved, (prev, next: boolean): Like => ({
    pressed: next,
    total: Math.max(0, prev.total + (next ? 1 : -1)),
  }));
  const [, startTransition] = useTransition();
  // 연달아 누르면 응답이 뒤섞임. 마지막에 보낸 것만 반영함
  const latest = useRef(0);

  const toggle = (next: boolean) => {
    startTransition(async () => {
      showNext(next);
      const ticket = ++latest.current;

      try {
        const result = await toggleLike(postId);
        // 서버가 판정한 값으로 맞춤. 두 기기에서 동시에 눌러도 어긋나지 않음
        if (ticket === latest.current) {
          setSaved({ pressed: result.liked, total: result.count });
        }
      } catch {
        // saved 를 건드리지 않았으므로 낙관적 값만 걷히면 눌리기 전으로 돌아감
        snackbar.create({
          onClose: () => {},
          render: () => (
            <Snackbar
              variant="critical"
              message="공감을 저장하지 못했어요. 잠시 후 다시 눌러 주세요"
            />
          ),
        });
      }
    });
  };

  return (
    <ReactionButton
      pressed={shown.pressed}
      onPressedChange={toggle}
      aria-label={shown.pressed ? "공감 취소" : "공감하기"}
    >
      <PrefixIcon svg={shown.pressed ? <IconHeartFill /> : <IconHeartLine />} />
      {shown.total}
    </ReactionButton>
  );
}
