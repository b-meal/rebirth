import type { Metadata, Viewport } from "next";

import "@seed-design/css/all.css";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { AppFrame } from "@/components/ui/app-frame";
import { Providers } from "./providers";

// OG 메타와 QR 코드의 절대 URL 생성 기준
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 첫 페인트 전에 SEED 색 모드 속성을 채워 하이드레이션 불일치 방지
const COLOR_SCHEME_SCRIPT = `try{var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){document.documentElement.dataset.seedUserColorScheme=m.matches?"dark":"light"};a();m.addEventListener?m.addEventListener("change",a):m.addListener(a)}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "다시집",
    template: "%s · 다시집",
  },
  description: "길에서 만난 보호자 없는 동물을 사진 한 장으로 제보합니다.",
  icons: { icon: "/logo/logo-mark-512.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  // 이것이 없으면 env(safe-area-inset-*) 이 늘 0 이라 홈 인디케이터를 피할 수 없음
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      data-seed=""
      data-seed-color-mode="system"
      data-seed-user-color-scheme="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
