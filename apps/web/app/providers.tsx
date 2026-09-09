"use client";

import type { ReactNode } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";

import { system } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";

// ThemeProvider 가 밖. 안쪽에 두면 next-themes 의 인라인 script 와
// Emotion 의 전역 style 이 같은 첫 자리를 다퉈 하이드레이션이 어긋남
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <ChakraProvider value={system}>
        {children}
        <Toaster />
      </ChakraProvider>
    </ThemeProvider>
  );
}
