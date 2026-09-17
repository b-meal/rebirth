"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AspectRatio, Box, HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";
import type { AnimalType } from "@rebirth/types";
import { LIST_PERIOD_DAYS } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { ResultSection } from "seed-design/ui/result-section";

import { CARE_LABEL, describeAnimal, sinceLabel } from "@/lib/report-label";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { Badge } from "@/components/ui/badge";

// WEB-08 최근 제보를 조건으로 좁혀 훑되 품종 필터와 거리 정렬은 두지 않음

export type ListItem = {
  id: string;
  animalType: AnimalType;
  appearance: string | null;
  colors: string[];
  size: string;
  careSituation: string;
  injury: boolean | null;
  areaName: string | null;
  occurredAt: Date;
  /** 대표 사진 축소본. 사진이 없거나 서명이 실패하면 null */
  photoUrl?: string | null;
  /** 이 목록에는 발견 제보와 실종 신고가 함께 나와 부르는 말이 갈림 */
  kind?: "sighting" | "lost";
  /** 보호자가 적어 둔 이름. 실종 신고에만 있음 */
  petName?: string | null;
};

/** 목록 API 응답. 날짜는 JSON 을 거치며 문자열이 됨 */
type ListResponse = {
  items: (Omit<ListItem, "occurredAt"> & { occurredAt: string })[];
  nextCursor: string | null;
};

function toItems(rows: ListResponse["items"]): ListItem[] {
  return rows.map((item) => ({ ...item, occurredAt: new Date(item.occurredAt) }));
}

const TYPE_OPTIONS: { value: AnimalType; label: string }[] = [
  { value: "dog", label: "개" },
  { value: "cat", label: "고양이" },
  { value: "other", label: "그 외" },
];

/** 카드 사진 한 변. 글 두세 줄과 높이가 맞는 크기 */
const THUMB = "88px";

function Card({ item }: { item: ListItem }) {
  const lost = item.kind === "lost";
  // 이름을 아는 기록은 이름이 먼저 읽혀야 함
  const title = item.petName || describeAnimal(item);

  return (
    <Box
      asChild
      p="x3"
      borderRadius="r3"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.layerDefault"
      minWidth="0"
    >
      {/* 링크로 두어 키보드 이동과 새 탭 열기가 그대로 동작함 */}
      <Link href={`/r/${item.id}`} className="rebirth-card">
        <HStack gap="x3" align="stretch" minWidth="0">
          {item.photoUrl ? (
            <Box width={THUMB} minWidth={THUMB}>
              {/* 이름은 옆 제목이 이미 읽어 줌. 사진은 생김새를 말해야 보탬이 됨 */}
              <ImageFrame
                ratio={1}
                src={item.photoUrl}
                alt={describeAnimal(item)}
                borderRadius="r2"
              />
            </Box>
          ) : (
            // 사진 없는 제보도 같은 자리를 차지해 줄이 들쭉날쭉해지지 않음
            <Box width={THUMB} minWidth={THUMB}>
              <AspectRatio ratio={1} borderRadius="r2" bg="bg.neutralWeak">
                <VStack align="center" justify="center" height="full">
                  <Icon svg={<IconPawprintLine />} size="x7" color="fg.neutralSubtle" />
                </VStack>
              </AspectRatio>
            </Box>
          )}

          <VStack align="stretch" gap="x1" grow={1} minWidth="0" justify="center">
            <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
              {title}
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={1}>
              {/* 이름이 제목을 차지했으면 생김새를 여기에 붙여 무엇을 찾는지 알림 */}
              {item.petName ? `${describeAnimal(item)}, ` : ""}
              {item.areaName ?? "지역 미확인"}, {sinceLabel(item.occurredAt)}
            </Text>
            {/* 상황은 색으로 먼저 읽히고 글자가 뜻을 확인해 줌 */}
            <HStack gap="x1" align="center" wrap>
              {/* 실종은 보호 상황을 쓰지 않아 확인되지 않음 이 박히면 안 됨 */}
              {lost ? (
                <Badge label="찾는 중" tone="brand" />
              ) : (
                <Badge
                  label={CARE_LABEL[item.careSituation] ?? "확인되지 않음"}
                  tone={item.careSituation === "in_care" ? "informative" : "neutral"}
                />
              )}
              {item.injury === true ? (
                <Badge label="다친 것으로 보임" tone="critical" />
              ) : null}
            </HStack>
          </VStack>
        </HStack>
      </Link>
    </Box>
  );
}

export type ReportListProps = {
  items: ListItem[];
  nextCursor: string | null;
};

export function ReportList({ items, nextCursor }: ReportListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [extra, setExtra] = useState<ListItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const animalType = params.get("animalType");
  const days = Number(params.get("days")) || LIST_PERIOD_DAYS[0];

  // 서버가 새 쪽을 그려 보내면 쌓아 둔 것을 버리고 그 쪽에서 다시 시작함
  // 조건을 바꿀 때가 이 경우라, 옛 커서와 옛 목록이 남아 섞이지 않음
  const serverPage = `${nextCursor ?? ""}|${items.length}`;
  const [drawn, setDrawn] = useState(serverPage);
  if (drawn !== serverPage) {
    setDrawn(serverPage);
    setExtra([]);
    setCursor(nextCursor);
  }

  // 조건을 URL 에 담아 상세에서 뒤로 왔을 때 그대로 복원됨
  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && next.get(key) !== value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const query = new URLSearchParams(params.toString());
      query.set("cursor", cursor);
      const response = await fetch(`/api/reports?${query}`);
      if (!response.ok) throw new Error("list");
      const data = (await response.json()) as ListResponse;
      setExtra((current) => [...current, ...toItems(data.items)]);
      setCursor(data.nextCursor);
    } catch {
      // 자동으로 다시 부르지 않고 사용자가 누를 때만 재시도함
      setLoadError("더 불러오지 못했어요. 다시 시도해 주세요");
    } finally {
      setLoadingMore(false);
    }
  };

  const rows = [...items, ...extra];
  const filtered = Boolean(animalType) || days !== LIST_PERIOD_DAYS[0];

  return (
    <Screen>
      <AppHeader title="발견 제보" />
      <ScreenBody gap="x4" pt="x3">
        <Section gap="x2">
          {/* 조건이 늘면 줄바꿈 대신 옆으로 밀림, 목록이 아래로 내려가지 않음 */}
          <Box className="rebirth-scroll-row rebirth-bleed">
            <HStack gap="spacingX.betweenChips">
              {TYPE_OPTIONS.map((option) => (
                <Chip.Toggle
                  key={option.value}
                  checked={animalType === option.value}
                  onCheckedChange={() => setParam("animalType", option.value)}
                >
                  <Chip.Label>{option.label}</Chip.Label>
                </Chip.Toggle>
              ))}
            </HStack>
          </Box>
          <Box className="rebirth-scroll-row rebirth-bleed">
            <HStack gap="spacingX.betweenChips">
              {LIST_PERIOD_DAYS.map((period) => (
                <Chip.Toggle
                  key={period}
                  checked={days === period}
                  onCheckedChange={() => setParam("days", String(period))}
                >
                  <Chip.Label>최근 {period}일</Chip.Label>
                </Chip.Toggle>
              ))}
            </HStack>
          </Box>
        </Section>

        <HStack justify="space-between" align="center">
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {pending ? "불러오는 중" : `${rows.length}건`}
          </Text>
          {filtered ? (
            <ActionButton variant="ghost" size="xsmall" onClick={() => router.replace(pathname)}>
              조건 초기화
            </ActionButton>
          ) : null}
        </HStack>

        {rows.length === 0 ? (
          <ResultSection
            size="medium"
            title="조건에 맞는 제보가 없어요"
            description="조건을 줄이면 더 많은 제보를 볼 수 있어요"
            {...(filtered && {
              primaryActionProps: {
                children: "전체 보기",
                onClick: () => router.replace(pathname),
              },
            })}
          />
        ) : (
          // 조건을 바꾸는 동안 문구 대신 목록을 흐려 전환 중임을 보여 줌
          <VStack
            align="stretch"
            gap="x2"
            style={{ opacity: pending ? 0.4 : 1, transition: "opacity 120ms ease" }}
          >
            {rows.map((item) => (
              <Card key={item.id} item={item} />
            ))}
          </VStack>
        )}

        {loadError ? <Callout tone="critical" description={loadError} /> : null}

        {cursor ? (
          <ActionButton
            variant="neutralOutline"
            size="large"
            loading={loadingMore}
            onClick={loadMore}
          >
            더 보기
          </ActionButton>
        ) : rows.length > 0 ? (
          <Text textStyle="t2Regular" color="fg.neutralSubtle" align="center">
            마지막 제보까지 다 봤어요
          </Text>
        ) : null}
      </ScreenBody>
    </Screen>
  );
}
