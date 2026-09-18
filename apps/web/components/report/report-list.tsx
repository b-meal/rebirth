"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AspectRatio, Box, HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";
import type { AnimalType } from "@rebirth/types";
import { LIST_DEFAULT_DAYS, LIST_PERIOD_DAYS } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { ResultSection } from "seed-design/ui/result-section";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger } from "seed-design/ui/select";

import { STATUS_LABEL, describeAnimal, sinceLabel } from "@/lib/report-label";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { Badge } from "@/components/ui/badge";

// WEB-08 최근 제보를 조건으로 좁혀 훑되 품종 필터와 거리 정렬은 두지 않음
// 한 화면에 한 종류만 담음. 발견 제보와 실종 신고는 찾는 말과 읽는 목적이 달라 섞지 않음

/** 목록이 담는 제보 종류 */
export type ListKind = "sighting" | "lost";

// 종류마다 부르는 말이 달라 화면 문구를 한곳에 모아 둠
const COPY: Record<ListKind, { title: string; empty: string; end: string }> = {
  sighting: {
    title: "발견 제보",
    empty: "조건에 맞는 제보가 없어요",
    end: "마지막 제보까지 다 봤어요",
  },
  lost: {
    title: "실종 신고",
    empty: "조건에 맞는 실종 신고가 없어요",
    end: "마지막 신고까지 다 봤어요",
  },
};

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

function Card({ item, kind }: { item: ListItem; kind: ListKind }) {
  const lost = item.kind === "lost";
  // 실종만 모인 목록에서는 모든 줄이 같은 배지라 알려 주는 것이 없어 뺌
  const showStatus = kind !== "lost";
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
              {!showStatus ? null : lost ? (
                <Badge label={STATUS_LABEL.lost} tone="brand" />
              ) : STATUS_LABEL[item.careSituation] ? (
                <Badge
                  label={STATUS_LABEL[item.careSituation]}
                  tone={item.careSituation === "in_care" ? "informative" : "neutral"}
                />
              ) : null}
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
  /** 이 목록이 담는 종류. 다음 장 요청과 화면 문구가 이 값을 따름 */
  kind: ListKind;
  items: ListItem[];
  nextCursor: string | null;
};

export function ReportList({ kind, items, nextCursor }: ReportListProps) {
  const copy = COPY[kind];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [extra, setExtra] = useState<ListItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const animalType = params.get("animalType");
  // 주소에 아무 값이나 들어와도 셀렉트가 고를 수 있는 값만 남김, 서버 질의도 같은 기준으로 자름
  const askedDays = Number(params.get("days"));
  const days = (LIST_PERIOD_DAYS as readonly number[]).includes(askedDays)
    ? askedDays
    : LIST_DEFAULT_DAYS;

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
  const go = (next: URLSearchParams) => {
    startTransition(() => {
      router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  // 칩은 켠 값을 다시 눌러 끄는 자리라 같은 값이 오면 지움
  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && next.get(key) !== value) next.set(key, value);
    else next.delete(key);
    go(next);
  };

  // 셀렉트는 끄는 자리가 없어 고른 값을 그대로 씀, 같은 값을 다시 골라도 기간이 풀리지 않음
  // 기본값은 주소에서 빼 조건 없는 목록 주소가 그대로 공유됨
  const setDays = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (Number(value) === LIST_DEFAULT_DAYS) next.delete("days");
    else next.set("days", value);
    go(next);
  };

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const query = new URLSearchParams(params.toString());
      query.set("cursor", cursor);
      // 첫 장을 그린 서버 질의와 같은 종류로 묶어야 둘째 장부터 다른 종류가 섞이지 않음
      query.set("kind", kind);
      const response = await fetch(`/api/reports?${query}`);
      if (!response.ok) throw new Error("list");
      const data = (await response.json()) as ListResponse;
      setExtra((current) => [...current, ...toItems(data.items)]);
      setCursor(data.nextCursor);
    } catch {
      // 자동으로 다시 부르지 않고 사용자가 누를 때만 재시도함
      setLoadError("더 불러오지 못했어요. 다시 눌러 주세요");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, params, kind]);

  // 끝에 닿기 전에 다음 쪽을 미리 불러 둠. 실패한 뒤에는 손으로 누를 때만 다시 부름
  const sentinel = useInfiniteScroll({
    hasMore: Boolean(cursor) && !loadError,
    loading: loadingMore,
    onLoad: loadMore,
  });

  const rows = [...items, ...extra];

  return (
    <Screen>
      <AppHeader title={copy.title} />
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
        </Section>

        {/* 기간은 고르는 값이 셋뿐이고 한 번 정하면 잘 바꾸지 않아 건수 옆 오른쪽 끝에 접어 둠
            칩으로 늘어놓으면 종류 칩과 두 줄이 되어 목록이 그만큼 아래로 내려감 */}
        <HStack justify="space-between" align="center" gap="x2">
          {/* 불러오는 동안에도 앞서 본 수를 그대로 두고 새 목록이 닿을 때 숫자만 바뀜
              자리를 문구로 바꾸면 줄 폭이 흔들리고 방금 본 수도 사라짐 */}
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {rows.length}건
          </Text>
          <HStack align="center" gap="x2">
            <Box className="rebirth-period-select">
              {/* 건수와 같은 줄에 앉는 보조 조작이라 폼 입력 크기인 large 대신 medium 으로 둠
                  크기는 Root 에 주어 트리거와 펼친 목록이 같은 치수를 씀 */}
              <SelectRoot
                size="medium"
                value={[String(days)]}
                onValueChange={([picked]) => setDays(picked!)}
              >
                <SelectTrigger aria-label="조회 기간" />
                <SelectContent className="rebirth-period-options">
                  {LIST_PERIOD_DAYS.map((period) => (
                    <SelectItem key={period} value={String(period)} label={`최근 ${period}일`} />
                  ))}
                </SelectContent>
              </SelectRoot>
            </Box>
          </HStack>
        </HStack>

        {pending ? (
          // 조건을 바꾸는 동안에는 옛 목록을 치우고 이 자리에서 돌림
          // 흐린 옛 목록을 남기면 바뀐 조건의 결과로 잘못 읽힘
          <HStack justify="center" py="x10">
            <ProgressCircle size="24" tone="neutral" />
          </HStack>
        ) : rows.length === 0 ? (
          <ResultSection
            size="medium"
            title={copy.empty}
            description="조건을 줄이면 더 많은 제보를 볼 수 있어요"
          />
        ) : (
          <VStack align="stretch" gap="x2">
            {rows.map((item) => (
              <Card key={item.id} item={item} kind={kind} />
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
              loading={loadingMore}
              onClick={loadMore}
            >
              다시 시도
            </ActionButton>
          </VStack>
        ) : null}

        {/* 목록 끝에 닿기 전에 다음 쪽을 미리 부르는 표식
            보이지 않지만 자리를 차지해야 관찰자가 걸림 */}
        {cursor && !loadError ? <Box ref={sentinel} height="x1" /> : null}

        {/* 불러오는 동안만 표시를 둠. 미리 불러 두면 대개 보이지 않고 지나감 */}
        {loadingMore && !loadError ? (
          <HStack justify="center" py="x4">
            <ProgressCircle size="24" tone="neutral" />
          </HStack>
        ) : null}

        {!cursor && rows.length > 0 ? (
          <Text textStyle="t2Regular" color="fg.neutralSubtle" align="center">
            {copy.end}
          </Text>
        ) : null}
      </ScreenBody>
    </Screen>
  );
}
