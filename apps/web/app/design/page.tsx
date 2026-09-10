import type { Metadata } from "next";

import { DesignSystem } from "@/components/design/design-system";

// 모바일 디자인 시스템 카탈로그, 토큰과 모든 컴포넌트를 한 화면에서 확인하는 내부 페이지

export const metadata: Metadata = {
  title: "디자인 시스템",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignSystem />;
}
