"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Box, HStack, ImageFrame, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { ResultSection } from "seed-design/ui/result-section";
import type { AnimalType } from "@rebirth/types";

import { markNotificationsRead, unsubscribeArea } from "@/app/mine/notifications/actions";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { AppHeader } from "@/components/ui/app-header";
import { Screen, SectionCard } from "@/components/ui/screen";
import { STATUS_LABEL, describeAnimal, sinceLabel } from "@/lib/report-label";

// 구독한 동네에 올라온 제보를 모아 보여 주는 알림함
// 서버는 마지막으로 본 시각 하나로 점을 판단하고, 방금 열어 본 줄은 화면이 따로 지움
// 뒤로 오면 라우터가 그린 화면을 되살려 서버를 다시 부르지 않아 점이 그대로 남기 때문
// 화면이 새로 그려지는 경우에는 읽은 시각이 이미 올라가 있어 점이 모두 사라짐

export type NotificationArea = {
  areaCode: string;
  areaName: string;
  unread: number;
};

export type NotificationItem = {
  id: string;
  animalType: AnimalType;
  colors: string[];
  size: string;
  careSituation: string;
  injury: boolean | null;
  areaName: string | null;
  createdAt: Date;
  photoUrl: string | null;
  /** 마지막으로 알림함을 본 뒤에 올라온 제보 */
  unread: boolean;
};

/** 내 실종 신고와 닮아 올라온 제보. 유사도일 뿐 같은 개체라는 뜻이 아님 */
export type MatchAlertItem = NotificationItem & {
  score: number;
  lostId: string;
  /** 보호자가 적어 둔 이름. 없으면 우리 아이 로 부름 */
  lostName: string | null;
};

export type NotificationListProps = {
  areas: NotificationArea[];
  items: NotificationItem[];
  /** 더 읽을 곳. 없으면 이 목록이 전부임 */
  nextCursor: string | null;
  matches: MatchAlertItem[];
};

/** 이어 읽은 쪽. 날짜는 JSON 을 거치며 문자열이 됨 */
type NotificationPageResponse = {
  items: (Omit<NotificationItem, "createdAt"> & { createdAt: string })[];
  nextCursor: string | null;
};

function toItems(rows: NotificationPageResponse["items"]): NotificationItem[] {
  return rows.map((item) => ({ ...item, createdAt: new Date(item.createdAt) }));
}

export function NotificationList({
  areas,
  items,
  nextCursor,
  matches,
}: NotificationListProps) {
  const [opened, setOpened] = useState<string[]>([]);
  const [extra, setExtra] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/mine/notifications?cursor=${encodeURIComponent(cursor)}`);
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as NotificationPageResponse;
      setExtra((prev) => [...prev, ...toItems(data.items)]);
      setCursor(data.nextCursor);
    } catch {
      setLoadError("더 불러오지 못했어요. 다시 눌러 주세요");
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  const sentinel = useInfiniteScroll({
    // 실패하면 관찰을 끊음. 자동으로 되풀이하면 같은 오류를 계속 부름
    hasMore: Boolean(cursor) && !loadError,
    loading,
    onLoad: () => void loadMore(),
  });

  const rows = [...items, ...extra];

  // 목록을 그린 뒤에 읽음으로 올림. 이번에 본 점은 남고 다음에 들어오면 사라짐
  useEffect(() => {
    if (areas.length === 0 && matches.length === 0) return;
    void markNotificationsRead();
  }, [areas.length, matches.length]);

  const markOpened = (id: string) =>
    setOpened((prev) => (prev.includes(id) ? prev : [...prev, id]));

  // 받을 것도 구독한 곳도 없는 첫 방문
  // 빈 절을 둘로 나눠 세우면 같은 말을 두 번 하고 갈 곳은 알려 주지 않음
  // 한 덩어리로 모아 가운데 세우고 여기서 바로 출발할 단추 하나만 둠
  if (areas.length === 0 && matches.length === 0 && rows.length === 0) {
    return (
      <Screen bg="bg.layerBasement">
        <AppHeader title="알림" />
        <ResultSection
          size="large"
          title="아직 받을 알림이 없어요"
          description="동네를 구독하면 그 동네에 올라온 새 제보를 여기로 모아 드려요"
          primaryActionProps={{
            asChild: true,
            size: "large",
            // 구독은 제보를 열어야 누를 수 있어 목록으로 보냄
            children: <Link href="/reports">발견 제보 둘러보기</Link>,
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="bg.layerBasement">
      <AppHeader title="알림" />

      <VStack align="stretch" grow={1} gap="x2">
        {/* 구독한 곳이 없으면 0 만 남아 알려 주는 것이 없어 절째로 빼둠 */}
        {areas.length > 0 ? (
          <SectionCard gap="x3">
            <HStack justify="space-between" align="center">
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                알림 받는 동네
              </Text>
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {areas.length}개
              </Text>
            </HStack>

            <VStack align="stretch" gap="x2">
              {areas.map((area) => (
                <AreaRow key={area.areaCode} area={area} />
              ))}
            </VStack>
          </SectionCard>
        ) : null}

        {matches.length > 0 ? (
          <SectionCard gap="x3">
            <HStack justify="space-between" align="center">
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                확인할 후보
              </Text>
              {/* 저울이 매긴 값일 뿐이라는 것을 절 제목 옆에서 한 번 밝힘 */}
              <Text textStyle="t2Regular" color="fg.neutralSubtle">
                확정 아님
              </Text>
            </HStack>
            <VStack align="stretch" gap="x3">
              {matches.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  unread={item.unread && !opened.includes(item.id)}
                  onOpen={() => markOpened(item.id)}
                  note={`${item.lostName ?? "우리 아이"} 신고와 ${item.score}점`}
                />
              ))}
            </VStack>
          </SectionCard>
        ) : null}

        {/* 구독한 곳도 쌓인 것도 없으면 빈 절만 남아 확인할 후보 를 아래로 밀어냄 */}
        {areas.length > 0 || rows.length > 0 ? (
        <SectionCard gap="x3" grow={1}>
          <Text as="h2" textStyle="t4Bold" color="fg.neutral">
            새 제보
          </Text>

          {rows.length === 0 ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              구독한 뒤에 올라온 제보가 여기에 쌓여요
            </Text>
          ) : (
            <VStack align="stretch" gap="x3">
              {rows.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  unread={item.unread && !opened.includes(item.id)}
                  onOpen={() => markOpened(item.id)}
                />
              ))}
            </VStack>
          )}

          {/* 실패했을 때만 손으로 다시 부름. 자동으로 되풀이하면 같은 오류를 계속 부름 */}
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
        </SectionCard>
        ) : null}
      </VStack>
    </Screen>
  );
}

function AreaRow({ area }: { area: NotificationArea }) {
  const [pending, start] = useTransition();

  return (
    <HStack justify="space-between" align="center" gap="x2">
      <HStack gap="x1_5" align="center" minWidth="0">
        <Text textStyle="t3Regular" color="fg.neutral" maxLines={1}>
          {area.areaName}
        </Text>
        {area.unread > 0 ? (
          <Text textStyle="t2Bold" color="fg.brand">
            새 {area.unread > 99 ? "99+" : area.unread}건
          </Text>
        ) : null}
      </HStack>
      <ActionButton
        variant="ghost"
        size="xsmall"
        loading={pending}
        onClick={() => start(() => void unsubscribeArea(area.areaCode))}
      >
        해제
      </ActionButton>
    </HStack>
  );
}

function NotificationRow({
  item,
  unread,
  onOpen,
  note,
}: {
  item: NotificationItem;
  unread: boolean;
  onOpen: () => void;
  /** 왜 이 줄이 올라왔는지. 닮은 제보 절에서만 채움 */
  note?: string;
}) {
  return (
    <HStack asChild gap="x3" align="center" minWidth="0">
      <Link href={`/r/${item.id}`} className="rebirth-row" onClick={onOpen}>
        {item.photoUrl ? (
          <ImageFrame
            ratio={1}
            width="x14"
            src={item.photoUrl}
            alt={describeAnimal(item)}
            borderRadius="r2"
          />
        ) : (
          <Box width="x14" height="x14" borderRadius="r2" bg="bg.neutralWeak" />
        )}

        <VStack align="stretch" gap="x0_5" grow={1} minWidth="0">
          <Text textStyle="t3Bold" color="fg.neutral" maxLines={1}>
            {describeAnimal(item)}
          </Text>
          <Text textStyle="t2Regular" color="fg.neutralMuted" maxLines={1}>
            {item.areaName ?? "지역 미확인"} · {sinceLabel(item.createdAt)}
          </Text>
          {note ? (
            <Text textStyle="t2Bold" color="fg.brand" maxLines={1}>
              {note}
            </Text>
          ) : item.injury === true ? (
            <Text textStyle="t2Regular" color="fg.critical">
              다친 것으로 보임
            </Text>
          ) : (
            <Text textStyle="t2Regular" color="fg.neutralSubtle" maxLines={1}>
              {STATUS_LABEL[item.careSituation] ?? ""}
            </Text>
          )}
        </VStack>

        {/* 안 읽은 줄에만 붙는 점. 숫자를 쓰면 줄마다 세어야 해 표시만 둠 */}
        {unread ? (
          <Box width="x2" height="x2" borderRadius="full" bg="bg.brandSolid" />
        ) : null}
      </Link>
    </HStack>
  );
}
