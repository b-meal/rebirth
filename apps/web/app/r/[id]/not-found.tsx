"use client";

import { useRouter } from "next/navigation";
import { Button, FlexBox, TopNavigationButton, Typography } from "@wanteddev/wds";
import { AppShell } from "../../../components/layout/app-shell";

// WEB-07-E01. 숨김·삭제·없는 기록을 구분하지 않고 같은 화면으로 보임
export default function ReportNotFound() {
  const router = useRouter();

  return (
    <AppShell
      title="발견 제보"
      leading={
        <TopNavigationButton variant="text" color="assistive" onClick={() => router.back()}>
          뒤로
        </TopNavigationButton>
      }
      action={
        <Button size="large" fullWidth onClick={() => router.push("/")}>
          홈으로
        </Button>
      }
    >
      <FlexBox flexDirection="column" gap="8px" sx={{ paddingTop: "24px" }}>
        <Typography variant="title3" weight="bold">
          지금은 볼 수 없는 기록이에요
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          기록이 종료됐거나 공개가 멈춘 상태일 수 있어요. 사진과 외형 정보는 표시하지
          않습니다.
        </Typography>
      </FlexBox>

      <Typography variant="caption1" color="semantic.label.assistive">
        주소를 다시 확인해 주세요. 문의가 필요하면 고객 문의로 알려 주시면 됩니다
      </Typography>
    </AppShell>
  );
}
