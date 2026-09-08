import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Noto_Sans_KR } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "다시집 운영",
    template: "%s · 다시집 운영",
  },
  description: "발견동물 제보 검수와 운영 지표",
  // 운영 화면은 검색 노출 대상 아님
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={cn("h-full antialiased", "font-sans", notoSansKr.variable)}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
