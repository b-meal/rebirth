"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlexBox, Typography } from "@wanteddev/wds";

const NAV = [
  { href: "/", label: "개요" },
  { href: "/sightings", label: "제보" },
  { href: "/lost", label: "실종 신고" },
  { href: "/moderation", label: "검수" },
  { href: "/metrics", label: "지표" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <FlexBox flexDirection="column" gap="2px" sx={{ padding: "8px" }}>
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <FlexBox
              alignItems="center"
              sx={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: active ? "rgba(0, 0, 0, 0.06)" : "transparent",
              }}
            >
              <Typography variant="label1" weight={active ? "bold" : "regular"}>
                {item.label}
              </Typography>
            </FlexBox>
          </Link>
        );
      })}
    </FlexBox>
  );
}
