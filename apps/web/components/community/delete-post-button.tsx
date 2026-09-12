// design-system-allow:raw-element 보이지 않는 hidden 필드라 SEED 에 대응 컴포넌트가 없음
"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
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
// 달린 댓글도 함께 사라지므로 그 점을 먼저 알려 줌

/** 폼 안에서만 제출 상태를 읽을 수 있어 버튼을 따로 둠 */
function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <ActionButton type="submit" variant="criticalSolid" size="large" loading={pending}>
      삭제
    </ActionButton>
  );
}

export function DeletePostButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton variant="neutralWeak" size="xsmall" onClick={() => setOpen(true)}>
        삭제
      </ActionButton>

      <AlertDialogRoot open={open} onOpenChange={(next) => setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>글을 삭제할까요</AlertDialogTitle>
            <AlertDialogDescription>
              달린 댓글도 함께 사라져요. 되돌릴 수 없어요
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <form action={deletePost}>
              <input type="hidden" name="postId" value={postId} />
              <ConfirmButton />
            </form>
            <AlertDialogAction variant="neutralWeak" size="large" onClick={() => setOpen(false)}>
              그대로 둘게요
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </>
  );
}
