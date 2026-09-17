import type { Metadata } from "next";

import { CompassProbe } from "@/components/design/compass-probe";

// 폰에서 나침반 값이 오는지 눈으로 보는 내부 페이지

export const metadata: Metadata = {
  title: "나침반 진단",
  robots: { index: false, follow: false },
};

export default function CompassPage() {
  return <CompassProbe />;
}
