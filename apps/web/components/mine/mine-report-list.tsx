"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Box, Grid, HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconMagnifyingglassLine,
  IconPawprintLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { ResultSection } from "seed-design/ui/result-section";

import type { Lifecycle, Visibility } from "@rebirth/types";

import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { AppHeader } from "@/components/ui/app-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ReportCard, type ReportCardItem } from "@/components/report/report-card";
import { Screen, ScreenBody } from "@/components/ui/screen";
import { MineReportTabs } from "./mine-report-tabs";

// 마이페이지 카드에서 넘어오는 전체 목록
// 공개 목록과 달리 종료·숨김도 함께 보여 줌. 상태를 감추면 내 기록이 사라진 것처럼 보임
// 첫 쪽은 서버가 그리고 아래로 내려가면 이어서 받음

export type MineReportItem = ReportCardItem & {
  visibility: Visibility;
  lifecycle: Lifecycle;
};

export type MineReportListProps = {
  items: MineReportItem[];
  kind: "sighting" | "lost";
  /** 종류별 건수. 고른 쪽이 비어도 다른 쪽에 몇 건이 있는지 보여 줌 */
  counts: { sighting: number; lost: number };
  /** 더 읽을 곳. 없으면 이 목록이 전부임 */
  nextCursor: string | null;
};

/** 목록 API 응답 */
type PageResponse = {
  items: MineReportItem[];
  nextCursor: string | null;
};

const TITLE = {
  sighting: "내 발견 제보",
  lost: "내 실종 신고",
} as const;

export function MineReportList({
  items,
  kind,
  counts,
  nextCursor,
}: MineReportListProps) {
  const [extra, setExtra] = useState<MineReportItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 종류를 바꾸면 서버가 새 쪽을 그려 보냄. 쌓아 둔 것을 비우지 않으면 두 종류가 섞임
  const drawn = `${kind}|${nextCursor ?? ""}|${items.length}`;
  const [seen, setSeen] = useState(drawn);
  if (seen !== drawn) {
    setSeen(drawn);
    setExtra([]);
    setCursor(nextCursor);
    setLoadError(null);
  }

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoading(true);
    setLoadError(null);
    try {
      const query = new URLSearchParams({ kind, cursor });
      const response = await fetch(`/api/mine/reports?${query}`);
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as PageResponse;
      setExtra((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch {
      setLoadError("더 불러오지 못했어요. 다시 눌러 주세요");
    } finally {
      setLoading(false);
    }
  }, [cursor, kind]);

  const sentinel = useInfiniteScroll({
    // 실패하면 관찰을 끊음. 자동으로 되풀이하면 같은 오류를 계속 부름
    hasMore: Boolean(cursor) && !loadError,
    loading,
    onLoad: () => void loadMore(),
  });

  const rows = [...items, ...extra];

  return (
    <Screen>
      <AppHeader title={TITLE[kind]} />
      {rows.length === 0 ? (
        // 빈 화면이라도 종류 줄은 맨 위에 남아야 다른 쪽으로 건너갈 수 있음
        <ScreenBody gap="x6" pt="x3">
          <MineReportTabs kind={kind} counts={counts} />
          {/* 남은 높이를 받아 안내가 목록 자리 한가운데에 섬 */}
          <VStack align="stretch" justify="center" grow={1} gap="x6">
            <EmptyState kind={kind} />
            {/* 빈 이유가 두 가지로 읽히면 무엇을 할지 흐려져 첫 문장에 섞지 않고 아래에 둠
                화면 바닥까지 떨어뜨리면 관계 없는 약관처럼 보여 덩어리에 붙여 둠 */}
            <Text textStyle="t2Regular" color="fg.neutralSubtle" align="center">
              로그인 전에 남긴 기록은 발급받은 관리 주소에서 열려요
            </Text>
          </VStack>
        </ScreenBody>
      ) : (
        <ScreenBody gap="x5" pt="x3">
          <MineReportTabs kind={kind} counts={counts} />
          <Grid columns={2} gap="x4">
            {rows.map((item) => (
              <MineCard key={item.id} item={item} />
            ))}
          </Grid>

          {/* 실패했을 때만 손으로 다시 부름 */}
          {loadError ? (
            <VStack align="stretch" gap="x3">
              <Callout tone="critical" description={loadError} />
              <ActionButton
                variant="neutralOutline"
                size="large"
                loading={loading}
                onClick={() => void loadMore()}
              >
                다시 시도
              </ActionButton>
            </VStack>
          ) : null}

          {/* 목록 끝에 닿기 전에 다음 쪽을 미리 부르는 표식
              보이지 않지만 자리를 차지해야 관찰자가 걸림 */}
          {cursor && !loadError ? <Box ref={sentinel} height="x1" /> : null}

          {/* 불러오는 동안만 표시를 둠. 미리 불러 두면 대개 보이지 않고 지나감 */}
          {loading && !loadError ? (
            <HStack justify="center" py="x4">
              <ProgressCircle size="24" tone="neutral" />
            </HStack>
          ) : null}
        </ScreenBody>
      )}
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

// 왼쪽 위에 붙여 두면 아래 넓은 여백이 무언가 빠진 자리처럼 보여 가운데에 둠
function EmptyState({ kind }: { kind: "sighting" | "lost" }) {
  const isLost = kind === "lost";

  return (
    <ResultSection
      // 안쪽에 grow 가 박혀 있어 남은 높이를 다 먹으면 아래 안내가 바닥까지 밀림
      style={{ flexGrow: 0 }}
      asset={
        <VStack
          align="center"
          justify="center"
          width="x16"
          height="x16"
          borderRadius="full"
          bg="bg.neutralWeak"
          mb="x5"
        >
          <Icon
            svg={isLost ? <IconMagnifyingglassLine /> : <IconPawprintLine />}
            size="x8"
            color="fg.neutralSubtle"
          />
        </VStack>
      }
      title={isLost ? "아직 신고한 반려동물이 없어요" : "아직 제보한 동물이 없어요"}
      description={
        isLost
          ? "사진과 마지막으로 본 곳을 남기면\n이웃이 함께 찾아요"
          : "길에서 만난 동물의 사진 한 장이면\n집으로 돌아가는 길이 열려요"
      }
      primaryActionProps={{
        variant: "brandSolid",
        size: "large",
        asChild: true,
        children: (
          <Link href={isLost ? "/lost/new" : "/report"}>
            {isLost ? "실종 신고하기" : "발견 제보하기"}
          </Link>
        ),
      }}
    />
  );
}
