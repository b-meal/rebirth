"use client";

import {
  Button,
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  FlexBox,
  TextField,
  Typography,
} from "@wanteddev/wds";

export function LoginView() {
  return (
    <FlexBox
      alignItems="center"
      justifyContent="center"
      sx={{ minHeight: "100vh", padding: "24px" }}
    >
      <Card width="360px">
        <CardContent>
          <CardTitle variant="title3">다시집 운영</CardTitle>
          <CardCaption variant="body2">발견동물 제보 검수와 운영 지표</CardCaption>
          <FlexBox flexDirection="column" gap="12px" sx={{ marginTop: "16px" }}>
            <FlexBox flexDirection="column" gap="4px">
              <Typography variant="label2">이메일</Typography>
              <TextField
                type="email"
                name="email"
                autoComplete="email"
                placeholder="admin@example.com"
              />
            </FlexBox>
            <FlexBox flexDirection="column" gap="4px">
              <Typography variant="label2">비밀번호</Typography>
              <TextField
                type="password"
                name="password"
                autoComplete="current-password"
              />
            </FlexBox>
            {/* 인증 연결 전이라 제출 비활성 */}
            <Button size="large" fullWidth disabled>
              로그인
            </Button>
            <Typography variant="caption1">인증 연결은 P1입니다.</Typography>
          </FlexBox>
        </CardContent>
      </Card>
    </FlexBox>
  );
}
