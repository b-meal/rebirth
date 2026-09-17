"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-90">
        <CardHeader>
          <CardTitle>다시집 운영</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">운영 비밀번호</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
            {message ? (
              <p className="text-xs text-destructive">{message}</p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "확인 중" : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
