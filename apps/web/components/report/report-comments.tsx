"use client";

import { reportClientError } from "@/lib/report-error";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconPersonFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import { Callout } from "seed-design/ui/callout";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { sinceLabel } from "@/lib/report-label";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

// 제보 아래 댓글, 작성자는 이 제보 안에서만 유효한 번호로 구분됨
// 첫 쪽은 서버가 그리고 아래로 내려가면 오래된 것 다음부터 이어 받음

export type ReportComment = {
  id: string;
  authorSeq: number;
  body: string;
  sinceLabel: string;
};

/** 이어 읽은 쪽. 날짜는 JSON 을 거치며 문자열이 됨 */
type CommentPageResponse = {
  items: { id: string; authorSeq: number; body: string; createdAt: string }[];
  nextCursor: string | null;
};

function toComments(rows: CommentPageResponse["items"]): ReportComment[] {
  return rows.map((row) => ({
    id: row.id,
    authorSeq: row.authorSeq,
    body: row.body,
    sinceLabel: sinceLabel(new Date(row.createdAt)),
  }));
}

const COMMENT_MAX = 300;

// 로그인이 없어 닉네임 대신 이 제보에서 몇 번째로 말한 사람인지만 표시함
function authorLabel(seq: number): string {
  return `이웃 ${seq}`;
}

export type ReportCommentsProps = {
  reportId: string;
  comments: ReportComment[];
  /** 더 읽을 곳. 없으면 이 목록이 전부임 */
  nextCursor: string | null;
};

export function ReportComments({ reportId, comments, nextCursor }: ReportCommentsProps) {
  const [extra, setExtra] = useState<ReportComment[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 댓글을 달면 서버가 목록을 다시 그려 보냄. 쌓아 둔 것을 비우지 않으면 같은 줄이 두 번 보임
  const drawn = `${nextCursor ?? ""}|${comments.length}`;
  const [seen, setSeen] = useState(drawn);
  if (seen !== drawn) {
    setSeen(drawn);
    setExtra([]);
    setCursor(nextCursor);
    setLoadError(null);
  }

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/reports/${reportId}/comments?cursor=${encodeURIComponent(cursor)}`,
      );
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as CommentPageResponse;
      setExtra((prev) => [...prev, ...toComments(data.items)]);
      setCursor(data.nextCursor);
    } catch {
      setLoadError("댓글을 더 불러오지 못했어요. 다시 눌러 주세요");
    } finally {
      setLoading(false);
    }
  }, [cursor, reportId]);

  const sentinel = useInfiniteScroll({
    // 실패하면 관찰을 끊음. 자동으로 되풀이하면 같은 오류를 계속 부름
    hasMore: Boolean(cursor) && !loadError,
    loading,
    onLoad: () => void loadMore(),
  });

  const rows = [...comments, ...extra];

  if (rows.length === 0) {
    return (
      <VStack align="stretch" gap="x1">
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          아직 댓글이 없어요
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralSubtle">
          같은 동물을 보셨거나 도울 방법을 알고 있다면 알려 주세요
        </Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap="x4">
      {rows.map((comment) => (
        <HStack key={comment.id} gap="x2_5" align="flex-start">
          <Avatar size="24" alt="" fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />} />
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

      {/* 실패했을 때만 손으로 다시 부름. 자동으로 되풀이하면 같은 오류를 계속 부름 */}
      {loadError ? (
        <VStack align="stretch" gap="x3">
          <Callout tone="critical" description={loadError} />
          <ActionButton
            variant="neutralOutline"
            size="medium"
            loading={loading}
            onClick={() => void loadMore()}
          >
            다시 시도
          </ActionButton>
        </VStack>
      ) : null}

      {/* 목록 끝에 닿기 전에 다음 쪽을 미리 부르는 표식
          보이지 않지만 자리를 차지해야 관찰자가 걸림 */}
      {cursor && !loadError ? <Box ref={sentinel} height="x1" /> : null}

      {/* 불러오는 동안만 표시를 둠. 미리 불러 두면 대개 보이지 않고 지나감 */}
      {loading && !loadError ? (
        <HStack justify="center" py="x2">
          <ProgressCircle size="24" tone="neutral" />
        </HStack>
      ) : null}
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
    // 서버가 같은 상한으로 거절하므로 보내기 전에 여기서 알림
    if (text.length > COMMENT_MAX) {
      notice(`댓글은 ${COMMENT_MAX}자까지 쓸 수 있어요`);
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { message?: string } | null;
        notice(error?.message ?? "댓글을 남기지 못했어요. 잠시 후 다시 시도해 주세요");
        return;
      }
      setBody("");
      // 서버가 목록을 다시 렌더하게 함, 낙관적 추가와 실제 순서가 어긋나지 않음
      router.refresh();
    } catch (error) {
      reportClientError("comment.create", error);
      notice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요");
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
            placeholder="목격 정보나 도울 방법을 남겨 주세요"
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
