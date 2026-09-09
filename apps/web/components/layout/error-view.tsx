"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button, FlexBox, TextButton, Typography } from "@wanteddev/wds";
import { AppShell } from "./app-shell";

// WEB-27. 원인과 다음 행동만 알리고 내부 정보는 드러내지 않음

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export type ErrorViewProps = {
  title: string;
  description: string;
  // Next 의 digest 를 그대로 씀. 스택·키·좌표·토큰은 넣지 않음
  requestId?: string;
  // 있으면 같은 요청을 한 번 더 시도함. 자동 재시도는 하지 않음
  onRetry?: () => void;
};

export function ErrorView({ title, description, requestId, onRetry }: ErrorViewProps) {
  const router = useRouter();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  return (
    <AppShell
      title="다시집"
      action={
        <FlexBox flexDirection="column" gap="8px" sx={{ width: "100%" }}>
          {onRetry && (
            <Button size="large" fullWidth onClick={onRetry}>
              다시 시도
            </Button>
          )}
          <Button
            size="large"
            variant="outlined"
            color="assistive"
            fullWidth
            onClick={() => router.push("/")}
          >
            홈으로
          </Button>
        </FlexBox>
      }
    >
      <FlexBox flexDirection="column" gap="8px" sx={{ paddingTop: "24px" }}>
        <Typography variant="title3" weight="bold">
          {online ? title : "연결이 끊긴 것 같아요"}
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          {online ? description : "연결 상태를 확인한 뒤 다시 시도해 주세요."}
        </Typography>
      </FlexBox>

      {requestId && (
        <FlexBox flexDirection="column" gap="4px">
          <Typography variant="caption1" color="semantic.label.assistive">
            요청 번호와 함께 문의할 수 있어요
          </Typography>
          <Typography variant="caption1" sx={{ userSelect: "all" }}>
            {requestId}
          </Typography>
        </FlexBox>
      )}

      <FlexBox>
        <TextButton size="small" onClick={() => router.push("/guide/injured")}>
          급한 상황이라면 안전 안내 보기
        </TextButton>
      </FlexBox>
    </AppShell>
  );
}
