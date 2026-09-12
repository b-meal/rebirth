import Link from "next/link";
import { Grid, HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconMagnifyingglassLine,
  IconPawprintLine,
} from "@karrotmarket/react-monochrome-icon";
import { ResultSection } from "seed-design/ui/result-section";

import type { Lifecycle, Visibility } from "@rebirth/types";

import { AppHeader } from "@/components/ui/app-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ReportCard, type ReportCardItem } from "@/components/report/report-card";
import { Screen, ScreenBody } from "@/components/ui/screen";

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
      {items.length === 0 ? (
        // 빈 화면은 본문 여백 대신 남은 높이를 다 받아 한가운데에 섬
        <ScreenBody justify="center" gap="x6">
          <EmptyState kind={kind} />
          {/* 빈 이유가 두 가지로 읽히면 무엇을 할지 흐려져 첫 문장에 섞지 않고 아래에 둠
              화면 바닥까지 떨어뜨리면 관계 없는 약관처럼 보여 덩어리에 붙여 둠 */}
          <Text textStyle="t2Regular" color="fg.neutralSubtle" align="center">
            로그인 전에 남긴 기록은 발급받은 관리 주소에서 열려요
          </Text>
        </ScreenBody>
      ) : (
        <ScreenBody gap="x5">
          <Grid columns={2} gap="x4">
            {items.map((item) => (
              <MineCard key={item.id} item={item} />
            ))}
          </Grid>
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
