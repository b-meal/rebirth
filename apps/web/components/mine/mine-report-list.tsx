import Link from "next/link";
import { Grid, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import type { Lifecycle, Visibility } from "@rebirth/types";

import { AppHeader } from "@/components/ui/app-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ReportCard, type ReportCardItem } from "@/components/report/report-card";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";

// 마이페이지 카드에서 넘어오는 전체 목록
// 공개 목록과 달리 종료·숨김도 함께 보여 줌. 상태를 감추면 내 기록이 사라진 것처럼 보임

export type MineReportItem = ReportCardItem & {
  visibility: Visibility;
  lifecycle: Lifecycle;
};

export type MineReportListProps = {
  items: MineReportItem[];
  kind: "sighting" | "lost";
};

const TITLE = {
  sighting: "내 발견 제보",
  lost: "내 실종 신고",
} as const;

export function MineReportList({ items, kind }: MineReportListProps) {
  return (
    <Screen>
      <AppHeader title={TITLE[kind]} />
      <ScreenBody gap="x5">
        {items.length === 0 ? (
          <EmptyState kind={kind} />
        ) : (
          <Grid columns={2} gap="x4">
            {items.map((item) => (
              <MineCard key={item.id} item={item} />
            ))}
          </Grid>
        )}
      </ScreenBody>
    </Screen>
  );
}

/** 카드는 공개 목록과 같은 것을 쓰고 상태만 위에 얹음 */
function MineCard({ item }: { item: MineReportItem }) {
  const state = stateBadge(item);

  return (
    <VStack align="stretch" gap="x1_5" minWidth="0">
      <ReportCard item={item} />
      {state ? (
        <HStack>
          <Badge label={state.label} tone={state.tone} />
        </HStack>
      ) : null}
    </VStack>
  );
}

/**
 * 공개 중인 진행 건은 배지를 달지 않음
 * 기본 상태까지 표시하면 살펴야 할 건이 묻힘
 */
function stateBadge(
  item: MineReportItem,
): { label: string; tone: BadgeTone } | null {
  if (item.visibility === "hidden") return { label: "숨김", tone: "critical" };
  if (item.lifecycle === "resolved") return { label: "찾음", tone: "brand" };
  if (item.lifecycle === "closed") return { label: "종료", tone: "neutral" };
  return null;
}

/** 로그인 전에 남긴 제보가 여기 없는 이유를 함께 알림 */
function EmptyState({ kind }: { kind: "sighting" | "lost" }) {
  const isLost = kind === "lost";

  return (
    <Section gap="x4">
      <VStack align="stretch" gap="x2">
        <Text textStyle="t5Bold" color="fg.neutral">
          아직 {isLost ? "실종 신고가" : "발견 제보가"} 없습니다
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          로그인하기 전에 남긴 기록은 계정에 묶이지 않아 이 목록에 없습니다.
          발급받은 관리 주소로 들어가면 그대로 열립니다
        </Text>
      </VStack>

      <HStack align="stretch">
        <ActionButton variant="brandSolid" size="large" flexGrow={1} asChild>
          <Link href={isLost ? "/lost/new" : "/report"}>
            {isLost ? "실종 신고하기" : "발견 제보하기"}
          </Link>
        </ActionButton>
      </HStack>
    </Section>
  );
}
