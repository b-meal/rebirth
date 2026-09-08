"use client";

import {
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  FlexBox,
  Typography,
} from "@wanteddev/wds";

// AI 초안 정확도는 ai_edited_fields 기준으로 계산
const METRICS = [
  { label: "AI 초안 수정률", source: "ai_edited_fields" },
  { label: "제보 완주율", source: "4단계 폼 이탈" },
  { label: "분석 1건 비용", source: "Anthropic usage" },
] as const;

export function MetricsView() {
  return (
    <>
      <Typography variant="title3" weight="bold">
        지표
      </Typography>
      <FlexBox flexWrap="wrap" gap="12px">
        {METRICS.map((metric) => (
          <Card key={metric.label} width="240px">
            <CardContent>
              <CardTitle variant="headline2">{metric.label}</CardTitle>
              <CardCaption variant="caption1">{metric.source}</CardCaption>
            </CardContent>
          </Card>
        ))}
      </FlexBox>
      <FallbackView>
        <FallbackViewContent>
          <FallbackViewText
            title="집계 연결 전"
            description="평가용 테스트 이미지 20장으로 정확도를 측정한 뒤 이 화면에 붙입니다."
          />
        </FallbackViewContent>
      </FallbackView>
    </>
  );
}
