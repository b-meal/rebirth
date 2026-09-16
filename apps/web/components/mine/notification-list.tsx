"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Box, HStack, ImageFrame, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import type { AnimalType } from "@rebirth/types";

import { markNotificationsRead, unsubscribeArea } from "@/app/mine/notifications/actions";
import { AppHeader } from "@/components/ui/app-header";
import { Screen, SectionCard } from "@/components/ui/screen";
import { CARE_LABEL, describeAnimal, sinceLabel } from "@/lib/report-label";

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
  matches: MatchAlertItem[];
};

export function NotificationList({ areas, items, matches }: NotificationListProps) {
  const [opened, setOpened] = useState<string[]>([]);

  // 목록을 그린 뒤에 읽음으로 올림. 이번에 본 점은 남고 다음에 들어오면 사라짐
  useEffect(() => {
    if (areas.length === 0 && matches.length === 0) return;
    void markNotificationsRead();
  }, [areas.length, matches.length]);

  const markOpened = (id: string) =>
    setOpened((prev) => (prev.includes(id) ? prev : [...prev, id]));

  return (
    <Screen bg="bg.layerBasement">
      <AppHeader title="알림" />

      <VStack align="stretch" grow={1} gap="x2">
        <SectionCard gap="x3">
          <HStack justify="space-between" align="center">
            <Text as="h2" textStyle="t4Bold" color="fg.neutral">
              알림 받는 동네
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {areas.length}개
            </Text>
          </HStack>

          {areas.length === 0 ? (
            <VStack align="stretch" gap="x1">
              <Text textStyle="t3Bold" color="fg.neutral">
                아직 알림 받는 동네가 없어요
              </Text>
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                제보를 열고 &lsquo;이 동네 알림 받기&rsquo;를 누르면 새 제보를 여기에 모아 드려요
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" gap="x2">
              {areas.map((area) => (
                <AreaRow key={area.areaCode} area={area} />
              ))}
            </VStack>
          )}
        </SectionCard>

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

        <SectionCard gap="x3" grow={1}>
          <Text as="h2" textStyle="t4Bold" color="fg.neutral">
            새 제보
          </Text>

          {items.length === 0 ? (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {areas.length === 0
                ? "동네를 구독하면 그 동네 제보가 여기에 쌓여요"
                : "구독한 뒤에 올라온 제보가 여기에 쌓여요"}
            </Text>
          ) : (
            <VStack align="stretch" gap="x3">
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  unread={item.unread && !opened.includes(item.id)}
                  onOpen={() => markOpened(item.id)}
                />
              ))}
            </VStack>
          )}
        </SectionCard>
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
              {CARE_LABEL[item.careSituation] ?? ""}
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
