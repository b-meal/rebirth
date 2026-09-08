import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = { title: "검수" };

export default function ModerationPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">검수</h1>
      <Alert>
        <AlertTitle>P0 기간 운영 방식</AlertTitle>
        <AlertDescription>
          신고가 들어온 제보는 Supabase 대시보드에서 status 를 hidden 으로 바꿔
          공개 목록에서 뺍니다.
        </AlertDescription>
      </Alert>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>검수 큐 연결 전</EmptyTitle>
          <EmptyDescription>
            검수 화면은 P1입니다. P0 가 끝나기 전에 착수하지 않습니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  );
}
