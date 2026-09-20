"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "개요" },
  { href: "/ai", label: "AI" },
  { href: "/sightings", label: "제보" },
  { href: "/lost", label: "실종 신고" },
  { href: "/moderation", label: "검수" },
  { href: "/metrics", label: "지표" },
  { href: "/errors", label: "오류" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-px border-t border-border p-2">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-sm",
              active
                ? "bg-accent font-bold text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
