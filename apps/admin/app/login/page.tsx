import type { Metadata } from "next";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form className="flex w-full max-w-xs flex-col gap-3">
        <h1 className="text-lg font-semibold">다시집 운영</h1>
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="border-foreground/20 rounded border px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className="border-foreground/20 rounded border px-2 py-1.5"
          />
        </label>
        {/* 인증 연결 전이라 제출 비활성 */}
        <button
          type="submit"
          disabled
          className="bg-foreground/10 rounded px-2 py-1.5 text-sm disabled:cursor-not-allowed"
        >
          로그인
        </button>
        <p className="text-foreground/50 text-xs">인증 연결은 P1입니다.</p>
      </form>
    </main>
  );
}
