"use client";

import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@wanteddev/wds-nextjs";
import { ThemeProvider } from "@wanteddev/wds";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
