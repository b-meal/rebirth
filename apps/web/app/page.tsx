"use client";

import { Button, Divider, FlexBox, TextButton, Typography } from "@wanteddev/wds";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <FlexBox
      flexDirection="column"
      justifyContent="center"
      gap="32px"
      sx={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px" }}
    >
      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="title2" weight="bold">
          다시집
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          다시 집으로 돌아갈 수 있도록, 길에서 만난 동물의 사진과 목격 정보를 안전하게
          전해 주세요.
        </Typography>
      </FlexBox>

      <FlexBox flexDirection="column" gap="12px">
        <Button size="large" fullWidth onClick={() => router.push("/report?step=1")}>
          발견동물 제보하기
        </Button>
        <Typography variant="caption1" color="semantic.label.assistive" align="center">
          설치와 회원가입 없이 시작할 수 있어요
        </Typography>
      </FlexBox>

      <Divider />

      {/* 긴급 상황에서 제보 폼을 끝까지 채우도록 강요하지 않음 */}
      <FlexBox flexDirection="column" gap="4px" alignItems="flex-start">
        <TextButton onClick={() => router.push("/guide/injured")}>
          다친 동물을 발견했어요
        </TextButton>
        <Typography variant="caption1" color="semantic.label.alternative">
          공식 신고와 안전 안내를 확인해요
        </Typography>
      </FlexBox>

      <FlexBox justifyContent="center">
        <TextButton size="small" onClick={() => router.push("/privacy")}>
          개인정보 처리
        </TextButton>
      </FlexBox>
    </FlexBox>
  );
}
