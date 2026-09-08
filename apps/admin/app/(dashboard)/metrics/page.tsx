import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Analytics01Icon } from "@hugeicons/core-free-icons";
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

export const metadata: Metadata = { title: "지표" };

// AI 초안 정확도는 ai_edited_fields 기준으로 계산
const METRICS = [
  { label: "AI 초안 수정률", source: "ai_edited_fields" },
  { label: "제보 완주율", source: "4단계 폼 이탈" },
  { label: "분석 1건 비용", source: "Anthropic usage" },
] as const;

export default function MetricsPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">지표</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm">{metric.label}</CardTitle>
              <CardDescription>{metric.source}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>집계 연결 전</EmptyTitle>
          <EmptyDescription>
            평가용 테스트 이미지 20장으로 정확도를 측정한 뒤 이 화면에 붙입니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  );
}
