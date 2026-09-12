// design-system-allow:space 다이얼로그 기본 폭 272px 는 recipe 상수라 넓힐 토큰이 없음

"use client";

import { useState, useTransition } from "react";
import { ResponsivePair } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from "seed-design/ui/alert-dialog";

import { deletePost } from "@/app/community/actions";

// 글 삭제. 되돌릴 수 없어 한 번 되물음

export function DeletePostButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // 폼으로 감싸면 그 폼이 푸터의 한 칸을 차지해 버튼만 홀로 좁아짐
  // 서버 액션을 직접 불러 두 버튼을 푸터의 형제로 둠
  const confirm = () => {
    startTransition(async () => {
      const form = new FormData();
      form.set("postId", postId);
      await deletePost(form);
    });
  };

  return (
    <>
      <ActionButton variant="neutralWeak" size="xsmall" onClick={() => setOpen(true)}>
        삭제
      </ActionButton>

      <AlertDialogRoot
        open={open}
        // 지우는 중에 닫히면 무슨 일이 일어나는지 알 수 없어 잠가 둠
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        {/* 기본 272px 는 제목 한 줄이 폭을 꽉 채워 답답함, 좌우 여백은 recipe 가 지킴 */}
        {/* 스타일 프롭을 받지 않아 style 로 넘김 */}
        <AlertDialogContent style={{ maxWidth: "320px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>글을 삭제할까요?</AlertDialogTitle>
            {/* 되돌릴 수 없다는 말은 삭제라는 단어가 이미 함, 놓치는 것은 댓글뿐 */}
            <AlertDialogDescription>
              달린 댓글도 모두 사라져요
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* 레이블이 길어지면 세로로 접히므로 두 단어 안으로 유지함 */}
            <ResponsivePair gap="x2">
              {/* 물러나는 쪽은 색을 쥐지 않음, 면이 둘이면 무게가 갈림 */}
              <AlertDialogAction
                variant="neutralWeak"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                취소
              </AlertDialogAction>
              {/* 지우는 동안 로딩을 보여 줘야 해 닫힘을 막고 직접 닫음 */}
              <AlertDialogAction
                variant="criticalSolid"
                loading={pending}
                onClick={(e) => {
                  e.preventDefault();
                  confirm();
                }}
              >
                삭제
              </AlertDialogAction>
            </ResponsivePair>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </>
  );
}
