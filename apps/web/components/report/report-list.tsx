"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import type { AnimalType } from "@rebirth/types";
import { LIST_PERIOD_DAYS } from "@rebirth/types";

import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionMessage } from "@/components/ui/section-message";

// WEB-08. 최근 제보를 조건으로 좁혀 훑음
// 품종 필터를 두지 않고 지역은 행정동까지만 보임. 거리 정렬도 제공하지 않음

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

const SIZE_LABEL: Record<string, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "",
};

const CARE_LABEL: Record<string, string> = {
  roaming: "배회 중",
  in_care: "제보자가 보호 중",
  unknown: "확인되지 않음",
};

const KST = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "long",
  timeStyle: "short",
});

// 품종은 단정하지 않고 털색과 크기로만 부름
function describe(item: ListItem) {
  const color = item.colors.join(" ");
  if (item.animalType === "dog") return `${color} ${SIZE_LABEL[item.size] ?? ""}견`.trim();
  if (item.animalType === "cat") return `${color} 고양이`.trim();
  return `${color} 동물`.trim();
}

function Card({ item }: { item: ListItem }) {
  return (
    <Flex
      asChild
      direction="column"
      gap="1"
      padding="4"
      borderRadius="card"
      borderWidth="1px"
      borderColor="border"
      textDecoration="none"
      color="inherit"
    >
      {/* 링크로 두어 키보드 이동과 새 탭 열기가 그대로 동작함 */}
      <Link href={`/r/${item.id}`}>
        <Text fontWeight="bold">{describe(item)}</Text>
        <Text textStyle="sm" color="fg.alternative">
          {item.areaName ?? "지역 미확인"}
        </Text>
        <Text textStyle="xs" color="fg.assistive">
          {KST.format(item.occurredAt)}
        </Text>
        <Flex gap="2" marginTop="1">
          <Text textStyle="xs" color="fg.alternative">
            {CARE_LABEL[item.careSituation] ?? ""}
          </Text>
          {item.injury === true ? (
            <Text textStyle="xs" color="fg.error">
              다친 것으로 보임
            </Text>
          ) : null}
        </Flex>
      </Link>
    </Flex>
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
    <Flex direction="column" gap="4" padding="5" paddingBottom="16">
      <Heading size="xl">최근 발견 제보</Heading>

      <Flex direction="column" gap="2">
        <Flex gap="2" wrap="wrap">
          {TYPE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={animalType === option.value}
              onClick={() => setParam("animalType", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </Flex>
        <Flex gap="2" wrap="wrap">
          {LIST_PERIOD_DAYS.map((period) => (
            <Chip
              key={period}
              active={days === period}
              onClick={() => setParam("days", String(period))}
            >
              최근 {period}일
            </Chip>
          ))}
        </Flex>
      </Flex>

      <Flex justify="space-between" align="center">
        <Text textStyle="sm" color="fg.alternative">
          {pending ? "불러오는 중" : `${rows.length}건`}
        </Text>
        {filtered ? (
          <Button variant="plain" size="sm" onClick={() => router.replace(pathname)}>
            조건 초기화
          </Button>
        ) : null}
      </Flex>

      {rows.length === 0 ? (
        <EmptyState
          title="조건에 맞는 제보가 없습니다"
          description="조건을 줄이면 더 많은 제보를 볼 수 있습니다"
          action={
            filtered ? (
              <Button variant="outline" onClick={() => router.replace(pathname)}>
                전체 보기
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Flex direction="column" gap="2">
          {rows.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </Flex>
      )}

      {loadError ? <SectionMessage variant="negative">{loadError}</SectionMessage> : null}

      {cursor ? (
        <Button variant="outline" width="100%" disabled={loadingMore} onClick={loadMore}>
          {loadingMore ? <Spinner size="sm" /> : "더 보기"}
        </Button>
      ) : rows.length > 0 ? (
        <Text textStyle="xs" color="fg.assistive" textAlign="center">
          마지막 제보까지 모두 보셨습니다
        </Text>
      ) : null}
    </Flex>
  );
}
