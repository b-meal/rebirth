"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
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

// 공유 비밀번호 한 겹. 계정 체계는 P1 이고 지금은 출입만 막음

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setMessage(body?.message ?? "로그인하지 못했습니다");
        return;
      }
      // 되돌아갈 곳이 바깥 주소면 무시함. 열린 리다이렉트 방지
      const next = params.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch {
      setMessage("서버에 닿지 못했습니다");
    } finally {
      setPending(false);
    }
  }

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
          <form onSubmit={onSubmit}>
            <FlexBox flexDirection="column" gap="12px" sx={{ marginTop: "16px" }}>
              <FlexBox flexDirection="column" gap="4px">
                <Typography variant="label2">운영 비밀번호</Typography>
                <TextField
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="ADMIN_API_TOKEN"
                  required
                />
              </FlexBox>
              {message ? (
                <Typography variant="caption1" color="semantic.status.negative">
                  {message}
                </Typography>
              ) : null}
              <Button type="submit" size="large" fullWidth disabled={pending}>
                {pending ? "확인 중" : "로그인"}
              </Button>
              <Typography variant="caption1">
                계정 체계는 P1입니다. 지금은 운영 토큰 한 겹입니다.
              </Typography>
            </FlexBox>
          </form>
        </CardContent>
      </Card>
    </FlexBox>
  );
}
