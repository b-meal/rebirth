"use client";

import {
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  Chip,
  FlexBox,
  Typography,
} from "@wanteddev/wds";

export function SightingDetailView({ id }: { id: string }) {
  return (
    <>
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="title3" weight="bold">
          제보 상세
        </Typography>
        <Chip size="small" variant="outlined" disableInteraction>
          {id}
        </Chip>
      </FlexBox>
      <Card>
        <CardContent>
          <CardTitle variant="headline2">조회 연결 전</CardTitle>
          <CardCaption variant="body2">
            AI 초안과 사용자 수정 이력, 서명 URL 사진을 이 화면에 붙입니다.
          </CardCaption>
          <Typography variant="caption1">
            품종은 단정하지 않고 계열 추정으로만 적습니다.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
}
