"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Button,
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  Chip,
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  FlexBox,
  Typography,
} from "@wanteddev/wds";

import { VISIBILITY_LABEL, when } from "@/lib/labels";
import { decideFlag, type ModerationResult } from "./actions";

// 판정은 공개 여부만 바꿈. 진행 상태는 운영자가 대신 인증하지 않음. POL-06

export type ModerationItem = {
  reportId: string;
  flagCount: number;
  firstReportedAt: string;
  reasons: string[];
  appearance: string | null;
  areaName: string | null;
  visibility: string | null;
};

function DecideButton({
  decision,
  label,
  variant,
}: {
  decision: "hide" | "keep";
  label: string;
  variant?: "outlined";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      size="small"
      variant={variant}
      disabled={pending}
    >
      {label}
    </Button>
  );
}

function QueueCard({ item }: { item: ModerationItem }) {
  const [state, action] = useActionState<ModerationResult, FormData>(decideFlag, {
    ok: false,
  });

  return (
    <Card>
      <CardContent>
        <FlexBox alignItems="center" flexWrap="wrap" gap="6px">
          <Chip size="xsmall" disableInteraction>
            신고 {item.flagCount}건
          </Chip>
          {item.visibility ? (
            <Chip size="xsmall" variant="outlined" disableInteraction>
              {VISIBILITY_LABEL[item.visibility]}
            </Chip>
          ) : null}
          <Typography variant="caption1">{when(item.firstReportedAt)}</Typography>
        </FlexBox>

        <CardTitle variant="headline2">
          <Link
            href={`/sightings/${item.reportId}`}
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            {item.appearance ?? "외형 미기재"}
          </Link>
        </CardTitle>
        <CardCaption variant="body2">신고 사유 {item.reasons.join(", ")}</CardCaption>
        <CardCaption variant="caption1">{item.areaName ?? "지역 미확인"}</CardCaption>

        <form action={action}>
          <input type="hidden" name="reportId" value={item.reportId} />
          <FlexBox alignItems="center" gap="8px">
            <DecideButton decision="hide" label="공개 목록에서 빼기" />
            <DecideButton decision="keep" label="유지" variant="outlined" />
            {state.message ? (
              <Typography variant="caption1" color="semantic.status.negative">
                {state.message}
              </Typography>
            ) : null}
          </FlexBox>
        </form>
      </CardContent>
    </Card>
  );
}

export function ModerationView({ items }: { items: ModerationItem[] }) {
  return (
    <>
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="title3" weight="bold">
          검수
        </Typography>
        <Typography variant="caption1">대기 {items.length}건</Typography>
      </FlexBox>

      {items.length === 0 ? (
        <FallbackView>
          <FallbackViewContent>
            <FallbackViewText
              title="검수 대기 없음"
              description="신고가 들어온 제보가 없습니다."
            />
          </FallbackViewContent>
        </FallbackView>
      ) : (
        <FlexBox flexDirection="column" gap="8px">
          {items.map((item) => (
            <QueueCard key={item.reportId} item={item} />
          ))}
        </FlexBox>
      )}

      <Typography variant="caption1">
        판정은 공개 여부만 바꿉니다. 종료 여부는 제보자만 정합니다.
      </Typography>
    </>
  );
}
