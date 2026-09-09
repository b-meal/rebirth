import Link from "next/link";
import { Button, FlexBox, Typography } from "@wanteddev/wds";

// 길에서 휴대폰을 꺼낸 사람이 3초 안에 무엇을 하는 화면인지 알아야 함
// 최근 제보 미리보기나 통계를 넣지 않음. 선택지를 늘리면 30초 목표가 무너짐

export default function HomePage() {
  return (
    <FlexBox
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="12px"
      sx={{ minHeight: "100dvh", padding: "24px", textAlign: "center" }}
    >
      <Typography variant="title1" weight="bold">
        다시집
      </Typography>
      <Typography variant="body2" sx={{ marginBottom: "16px" }}>
        길에서 만난 보호자 없는 동물을 사진 한 장으로 제보합니다
      </Typography>

      <Link href="/report" style={{ width: "100%", maxWidth: "320px" }}>
        <Button fullWidth size="large">
          제보 시작하기
        </Button>
      </Link>

      <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: "16px" }}>
        <Link href="/guide/injured">
          <Typography variant="caption1">다친 동물을 봤어요</Typography>
        </Link>
      </FlexBox>
    </FlexBox>
  );
}
