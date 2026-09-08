"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Analytics01Icon,
  DashboardCircleIcon,
  PawPrintIcon,
  SearchAlertIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV = [
  { href: "/", label: "개요", icon: DashboardCircleIcon },
  { href: "/sightings", label: "제보", icon: PawPrintIcon },
  { href: "/lost", label: "실종 신고", icon: SearchAlertIcon },
  { href: "/moderation", label: "검수", icon: Shield01Icon },
  { href: "/metrics", label: "지표", icon: Analytics01Icon },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>운영</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                }
                tooltip={item.label}
                render={<Link href={item.href} />}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
