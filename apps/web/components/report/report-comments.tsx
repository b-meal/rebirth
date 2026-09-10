"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconPersonFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

// 제보 아래 댓글, 작성자는 이 제보 안에서만 유효한 번호로 구분됨

export type ReportComment = {
  id: string;
  authorSeq: number;
  body: string;
  sinceLabel: string;
};

const COMMENT_MAX = 300;

// 로그인이 없어 닉네임 대신 이 제보에서 몇 번째로 말한 사람인지만 표시함
function authorLabel(seq: number): string {
  return `이웃 ${seq}`;
}

export function ReportComments({ comments }: { comments: ReportComment[] }) {
  if (comments.length === 0) {
    return (
      <VStack align="stretch" gap="x1">
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          아직 댓글이 없습니다
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralSubtle">
          같은 동물을 보셨거나 도울 방법을 알고 있다면 알려 주십시오
        </Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap="x4">
      {comments.map((comment) => (
        <HStack key={comment.id} gap="x2_5" align="flex-start">
          <Avatar size="24" fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />} />
          <VStack align="stretch" gap="x0_5" minWidth="0">
            <HStack gap="x1_5" align="center">
              <Text textStyle="t3Bold" color="fg.neutral">
                {authorLabel(comment.authorSeq)}
              </Text>
              <Text textStyle="t2Regular" color="fg.neutralSubtle">
                {comment.sinceLabel}
              </Text>
            </HStack>
            <Text textStyle="t4Regular" color="fg.neutral" whiteSpace="pre-wrap">
              {comment.body}
            </Text>
          </VStack>
        </HStack>
      ))}
    </VStack>
  );
}

/** 댓글 목록 아래에 붙는 입력 줄, 화면 아래 고정 자리는 다음 행동 버튼이 씀 */
export function CommentComposer({ reportId }: { reportId: string }) {
  const router = useRouter();
  const snackbar = useSnackbarAdapter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const notice = (message: string) =>
    snackbar.create({
      onClose: () => {},
      render: () => <Snackbar variant="critical" message={message} />,
    });

  const submit = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { message?: string } | null;
        notice(error?.message ?? "댓글을 남기지 못했습니다. 잠시 후 다시 시도해 주십시오");
        return;
      }
      setBody("");
      // 서버가 목록을 다시 렌더하게 함, 낙관적 추가와 실제 순서가 어긋나지 않음
      router.refresh();
    } catch {
      notice("연결이 끊겼습니다. 잠시 후 다시 시도해 주십시오");
    } finally {
      setSending(false);
    }
  };

  return (
    <HStack gap="x2" align="center">
      <VStack align="stretch" grow={1} minWidth="0">
        <TextField
          aria-label="댓글"
          size="medium"
          value={body}
          maxGraphemeCount={COMMENT_MAX}
          hideCharacterCount
          onValueChange={(next) => setBody(next.value)}
        >
          <TextFieldInput
            placeholder="목격 정보나 도울 방법을 남겨 주십시오"
            aria-label="댓글 입력"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              void submit();
            }}
          />
        </TextField>
      </VStack>
      <ActionButton
        variant="brandSolid"
        size="medium"
        loading={sending}
        disabled={body.trim().length === 0}
        onClick={() => void submit()}
      >
        등록
      </ActionButton>
    </HStack>
  );
}
