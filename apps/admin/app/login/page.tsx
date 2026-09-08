import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>다시집 운영</CardTitle>
          <CardDescription>발견동물 제보 검수와 운영 지표</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">이메일</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">비밀번호</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                />
                <FieldDescription>인증 연결은 P1입니다.</FieldDescription>
              </Field>
              {/* 인증 연결 전이라 제출 비활성 */}
              <Button type="submit" size="lg" disabled>
                로그인
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">
          P0 기간에는 제보 검수를 Supabase 대시보드로 직접 처리합니다.
        </CardFooter>
      </Card>
    </main>
  );
}
