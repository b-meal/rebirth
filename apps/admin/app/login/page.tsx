import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginView } from "./view";

export const metadata: Metadata = { title: "로그인", robots: { index: false } };

export default function LoginPage() {
  // useSearchParams 가 정적 프리렌더를 막으므로 경계를 둠
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
