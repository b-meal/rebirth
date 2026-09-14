"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  variant?: "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      size="sm"
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
      <CardHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="destructive">신고 {item.flagCount}건</Badge>
          {item.visibility ? (
            <Badge variant="outline">{VISIBILITY_LABEL[item.visibility]}</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {when(item.firstReportedAt)}
          </span>
        </div>
        <CardTitle className="font-normal">
          <Link
            href={`/sightings/${item.reportId}`}
            className="underline underline-offset-2"
          >
            {item.appearance ?? "외형 미기재"}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm">신고 사유 {item.reasons.join(", ")}</p>
        <p className="text-xs text-muted-foreground">{item.areaName ?? "지역 미확인"}</p>
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="reportId" value={item.reportId} />
          <DecideButton decision="hide" label="공개 목록에서 빼기" />
          <DecideButton decision="keep" label="유지" variant="outline" />
          {state.message ? (
            <span className="text-xs text-destructive">{state.message}</span>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

export function ModerationView({ items }: { items: ModerationItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold">검수</h1>
        <span className="text-xs text-muted-foreground">대기 {items.length}건</span>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10">
            <span className="text-sm font-bold">검수 대기 없음</span>
            <span className="text-xs text-muted-foreground">
              신고가 들어온 제보 없음
            </span>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <QueueCard key={item.reportId} item={item} />
          ))}
        </div>
      )}

    </div>
  );
}
