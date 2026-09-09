import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

// OG 메타와 QR 코드의 절대 URL 생성 기준
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
