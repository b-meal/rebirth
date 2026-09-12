// design-system-allow:raw-element 보이지 않는 hidden 필드라 SEED 에 대응 컴포넌트가 없음
"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconPersonFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { COMMENT_MAX } from "@rebirth/core/community";

import { createComment, type CommentFormState } from "@/app/community/actions";
import { sinceLabel } from "@/lib/report-label";

// 글 아래 댓글. 로그인 계정이 작성자라 이름과 사진이 함께 보임

export type PostCommentItem = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

function CommentRow({ comment }: { comment: PostCommentItem }) {
  return (
    <HStack gap="x2_5" align="flex-start">
      <Avatar
        size="24"
        src={comment.authorAvatarUrl ?? undefined}
        alt=""
        fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />}
      />
      <VStack align="stretch" gap="x0_5" minWidth="0">
        <HStack gap="x1_5" align="center">
          <Text textStyle="t3Bold" color="fg.neutral">
            {comment.authorName ?? "알 수 없음"}
          </Text>
          <Text textStyle="t2Regular" color="fg.neutralSubtle">
            {sinceLabel(comment.createdAt)}
          </Text>
        </HStack>
        <Text
          textStyle="t4Regular"
          color="fg.neutral"
          whiteSpace="pre-wrap"
          style={{ overflowWrap: "anywhere" }}
        >
          {comment.body}
        </Text>
      </VStack>
    </HStack>
  );
}

export function PostComments({ comments }: { comments: PostCommentItem[] }) {
  if (comments.length === 0) {
    return (
      <VStack align="stretch" gap="x1">
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          아직 댓글이 없어요
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralSubtle">
          먼저 말을 건네 보세요
        </Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap="x4">
      {comments.map((comment) => (
        <CommentRow key={comment.id} comment={comment} />
      ))}
    </VStack>
  );
}

/** 폼 안에서만 제출 상태를 읽을 수 있어 버튼을 따로 둠 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <ActionButton type="submit" variant="brandSolid" size="medium" loading={pending}>
      등록
    </ActionButton>
  );
}

export type CommentComposerProps = {
  postId: string;
  /** 비로그인은 입력 대신 로그인 권유를 보여 줌 */
  signedIn: boolean;
};

export function CommentComposer({ postId, signedIn }: CommentComposerProps) {
  const [state, formAction] = useActionState<CommentFormState, FormData>(
    createComment,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // 성공하면 입력칸을 비움. 실패했을 때 지우면 쓴 글이 사라짐
  useEffect(() => {
    if (!state.message) formRef.current?.reset();
  }, [state]);

  if (!signedIn) {
    return (
      <VStack align="stretch" gap="x2">
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          로그인하면 댓글을 남길 수 있어요
        </Text>
        <ActionButton asChild variant="neutralOutline" size="medium">
          <Link href={`/sign-in?next=${encodeURIComponent(`/community/${postId}`)}`}>
            로그인
          </Link>
        </ActionButton>
      </VStack>
    );
  }

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="postId" value={postId} />
      {/* 오류를 입력칸에 붙임. 위에 따로 띄우면 어느 칸이 문제인지 눈이 한 번 더 움직임 */}
      <HStack gap="x2" align="flex-start">
        <VStack align="stretch" grow={1} minWidth="0">
          <TextField
            aria-label="댓글"
            size="medium"
            maxGraphemeCount={COMMENT_MAX}
            hideCharacterCount
            errorMessage={state.message}
            invalid={Boolean(state.message)}
          >
            <TextFieldInput
              name="body"
              placeholder="따뜻한 말 한마디 남겨 주세요"
              aria-label="댓글 입력"
            />
          </TextField>
        </VStack>
        <SubmitButton />
      </HStack>
    </form>
  );
}
