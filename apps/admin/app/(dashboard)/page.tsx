import { HugeiconsIcon } from "@hugeicons/react";
import { DatabaseIcon } from "@hugeicons/core-free-icons";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// 집계 쿼리 연결 전 자리표시자
const TILES = [
  { label: "오늘 제보", hint: "sightings" },
  { label: "검수 대기", hint: "status open" },
  { label: "실종 신고", hint: "lost_pets" },
  { label: "확인할 후보", hint: "match_scores" },
] as const;

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">개요</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => (
          <Card key={tile.label}>
            <CardHeader>
              <CardTitle className="text-sm">{tile.label}</CardTitle>
              <CardDescription className="tabular-nums">
                집계 연결 전
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={DatabaseIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>데이터 연결 전</EmptyTitle>
          <EmptyDescription>
            운영 대시보드는 P1입니다. P0 기간에는 제보 검수를 Supabase
            대시보드로 직접 처리합니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  );
}
