"use client";

import { Button, FlexBox, Typography } from "@wanteddev/wds";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <FlexBox
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="8px"
      sx={{ minHeight: "100vh", padding: "24px", textAlign: "center" }}
    >
      <Typography variant="title2" weight="bold">
        다시집
      </Typography>
      <Typography variant="body2">
        길에서 만난 보호자 없는 동물을 사진 한 장으로 제보합니다.
      </Typography>
      <Button
        size="large"
        sx={{ marginTop: "16px" }}
        onClick={() => router.push("/report?step=1")}
      >
        발견동물 제보하기
      </Button>
    </FlexBox>
  );
}
