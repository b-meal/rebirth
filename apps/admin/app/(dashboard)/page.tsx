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

// 집계 쿼리 연결 전 자리표시자
const TILES = [
  { label: "오늘 제보", source: "sightings" },
  { label: "검수 대기", source: "status open" },
  { label: "실종 신고", source: "lost_pets" },
  { label: "확인할 후보", source: "match_scores" },
] as const;

export default function DashboardPage() {
  return (
    <>
      <Typography variant="title3" weight="bold">
        개요
      </Typography>
      <FlexBox flexWrap="wrap" gap="12px">
        {TILES.map((tile) => (
          <Card key={tile.label} width="220px">
            <CardContent>
              <CardTitle variant="headline2">{tile.label}</CardTitle>
              <CardCaption variant="caption1">{tile.source}</CardCaption>
            </CardContent>
          </Card>
        ))}
      </FlexBox>
      <FallbackView>
        <FallbackViewContent>
          <FallbackViewText
            title="데이터 연결 전"
            description="운영 대시보드는 P1입니다. P0 기간에는 제보 검수를 Supabase 대시보드로 직접 처리합니다."
          />
        </FallbackViewContent>
      </FallbackView>
    </>
  );
}
