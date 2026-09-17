"use client";

import Link from "next/link";
import { HStack } from "@seed-design/react";
import { Chip } from "seed-design/ui/chip";

// 내 기록의 종류를 고르는 줄
// 목록이 종류별로 갈려 있어 이 줄이 없으면 한쪽 기록에 닿을 길이 없음
// 주소로만 오가고 상태를 들지 않지만, Chip 이 "use client" 묶음이라
// 서버 컴포넌트에서 Chip.Button 을 읽으면 undefined 가 되어 이 파일만 클라이언트로 둠

export type MineReportKind = "sighting" | "lost";

const TABS = [
  { kind: "sighting", label: "발견 제보" },
  { kind: "lost", label: "실종 신고" },
] as const;

export type MineReportTabsProps = {
  kind: MineReportKind;
  counts: Record<MineReportKind, number>;
};

export function MineReportTabs({ kind, counts }: MineReportTabsProps) {
  return (
    <HStack gap="spacingX.betweenChips">
      {TABS.map((tab) => {
        const active = tab.kind === kind;
        return (
          // 고른 쪽만 채운 칩으로 두어 누르지 않아도 지금 어디인지 보임
          <Chip.Button
            key={tab.kind}
            asChild
            variant={active ? "solid" : "outlineWeak"}
          >
            <Link
              href={`/mine/reports?kind=${tab.kind}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
            >
              <Chip.Label>
                {tab.label} {counts[tab.kind]}
              </Chip.Label>
            </Link>
          </Chip.Button>
        );
      })}
    </HStack>
  );
}
