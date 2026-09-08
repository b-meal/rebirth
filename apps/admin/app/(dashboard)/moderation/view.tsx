"use client";

import {
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  Typography,
} from "@wanteddev/wds";

export function ModerationView() {
  return (
    <>
      <Typography variant="title3" weight="bold">
        검수
      </Typography>
      <Card>
        <CardContent>
          <CardTitle variant="headline2">P0 기간 운영 방식</CardTitle>
          <CardCaption variant="body2">
            신고가 들어온 제보는 Supabase 대시보드에서 status 를 hidden 으로
            바꿔 공개 목록에서 뺍니다.
          </CardCaption>
        </CardContent>
      </Card>
      <FallbackView>
        <FallbackViewContent>
          <FallbackViewText
            title="검수 큐 연결 전"
            description="검수 화면은 P1입니다. P0 가 끝나기 전에 착수하지 않습니다."
          />
        </FallbackViewContent>
      </FallbackView>
    </>
  );
}
