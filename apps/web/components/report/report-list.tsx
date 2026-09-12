"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import type { AnimalType } from "@rebirth/types";
import { LIST_PERIOD_DAYS } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { ResultSection } from "seed-design/ui/result-section";

import { CARE_LABEL, describeAnimal } from "@/lib/report-label";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

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
};

const TYPE_OPTIONS: { value: AnimalType; label: string }[] = [
  { value: "dog", label: "개" },
  { value: "cat", label: "고양이" },
  { value: "other", label: "그 외" },
];

const KST = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "long",
  timeStyle: "short",
});

function Card({ item }: { item: ListItem }) {
  return (
    <Box
      asChild
      p="x4"
      borderRadius="r3"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.layerDefault"
    >
      {/* 링크로 두어 키보드 이동과 새 탭 열기가 그대로 동작함 */}
      <Link href={`/r/${item.id}`} className="rebirth-card">
        <VStack align="stretch" gap="x1">
          <Text textStyle="t5Bold" color="fg.neutral">
            {describeAnimal(item)}
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {item.areaName ?? "지역 미확인"}
          </Text>
          <Text textStyle="t2Regular" color="fg.neutralSubtle">
            {KST.format(item.occurredAt)}
          </Text>
          <HStack gap="x2" mt="x1">
            <Text textStyle="t2Regular" color="fg.neutralMuted">
              {CARE_LABEL[item.careSituation] ?? ""}
            </Text>
            {item.injury === true ? (
              <Text textStyle="t2Regular" color="fg.critical">
                다친 것으로 보임
              </Text>
            ) : null}
          </HStack>
        </VStack>
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
      const data = (await response.json()) as { items: ListItem[]; nextCursor: string | null };
      setExtra((current) => [...current, ...data.items]);
      setCursor(data.nextCursor);
    } catch {
      // 자동으로 다시 부르지 않고 사용자가 누를 때만 재시도함
      setLoadError("더 불러오지 못했습니다. 다시 시도해 주십시오");
    } finally {
      setLoadingMore(false);
    }
  };

  const rows = [...items, ...extra];
  const filtered = Boolean(animalType) || days !== LIST_PERIOD_DAYS[0];

  return (
    <Screen>
      <AppHeader title="최근 발견 제보" />
      <ScreenBody gap="x5">
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          최근 발견 제보
        </Text>

        <Section gap="x2">
          <HStack gap="spacingX.betweenChips" wrap>
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
          <HStack gap="spacingX.betweenChips" wrap>
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
            title="조건에 맞는 제보가 없습니다"
            description="조건을 줄이면 더 많은 제보를 볼 수 있습니다"
            {...(filtered && {
              primaryActionProps: {
                children: "전체 보기",
                onClick: () => router.replace(pathname),
              },
            })}
          />
        ) : (
          <VStack align="stretch" gap="x2">
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
            마지막 제보까지 모두 보셨습니다
          </Text>
        ) : null}
      </ScreenBody>
    </Screen>
  );
}
