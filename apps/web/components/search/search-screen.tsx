"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Box, Divider, Grid, HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconCameraLine,
  IconChevronLeftLine,
  IconClockLine,
  IconMagnifyingglassLine,
  IconXmarkLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Chip } from "seed-design/ui/chip";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { distanceKm, type LatLng } from "@rebirth/core/location/geo";

import { useCurrentPosition } from "@/hooks/use-current-position";
import { Screen, SectionCard } from "@/components/ui/screen";
import { ReportCard, type ReportCardItem } from "@/components/report/report-card";
import { PhotoSearchSheet } from "@/components/search/photo-search-sheet";
import { TrendingChart, type TrendingItem } from "@/components/search/trending-chart";

// 검색 화면, 최근 검색은 브라우저에만 남기고 서버로 보내지 않음

const RECENT_KEY = "rebirth:recent-search";
const RECENT_MAX = 8;

// 자주 찾는 조건을 한 번에 거는 지름길
const SHORTCUTS = [
  { label: "개", params: "animalType=dog" },
  { label: "고양이", params: "animalType=cat" },
  { label: "소형", params: "size=small" },
  { label: "흰색", params: "colors=%ED%9D%B0%EC%83%89" },
  { label: "갈색", params: "colors=%EA%B0%88%EC%83%89" },
] as const;

// 발견 제보와 실종 신고는 찾는 말이 달라 목록과 문구를 가르는 기준
const SEARCH_KINDS = [
  { key: "sighting", label: "발견 제보 찾기", placeholder: "동물 특징이나 동네로 검색" },
  { key: "lost", label: "실종 신고 찾기", placeholder: "이름, 특징, 동네로 검색" },
] as const;

type SearchKind = (typeof SEARCH_KINDS)[number]["key"];

const CHARTS = [
  { key: "interest", label: "관심 많은 제보" },
  { key: "help", label: "도움이 급한 제보" },
] as const;

type ChartKey = (typeof CHARTS)[number]["key"];

// 저장소는 React 밖의 상태라 스냅숏으로 읽고 쓰기 뒤에 직접 알림
const RECENT_EVENT = "rebirth:recent-search-changed";
const EMPTY = "[]";

function subscribeRecent(onChange: () => void) {
  window.addEventListener(RECENT_EVENT, onChange);
  return () => {
    window.removeEventListener(RECENT_EVENT, onChange);
  };
}

function recentSnapshot(): string {
  try {
    return sessionStorage.getItem(RECENT_KEY) ?? EMPTY;
  } catch {
    // 사파리 프라이빗 모드는 읽기가 막힘, 최근 검색만 비워 둠
    return EMPTY;
  }
}

function writeRecent(list: string[]) {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // 저장이 막히면 이번 세션에만 남지 않음
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}

// 거리로 좁힐 때 쓰는 격자 좌표, 정확한 목격 지점이 아님
export type NearbyItem = ReportCardItem & { point: LatLng };

// 주변으로 볼 반경과 위치를 모를 때 보여 줄 수
const NEARBY_RADIUS_KM = 3;
const NEARBY_FALLBACK = 6;

export type SearchScreenProps = {
  query: string;
  kind: SearchKind;
  /** 조건이 없으면 null, 조건이 있고 결과가 없으면 빈 배열 */
  results: ReportCardItem[] | null;
  trending: Record<ChartKey, TrendingItem[]>;
  nearby: NearbyItem[];
};

export function SearchScreen({ query, kind, results, trending, nearby }: SearchScreenProps) {
  const router = useRouter();
  const position = useCurrentPosition({ immediate: true });
  const [keyword, setKeyword] = useState(query);
  const [chart, setChart] = useState<ChartKey>("interest");
  const [photoOpen, setPhotoOpen] = useState(false);

  // 서버 렌더에는 저장소가 없어 빈 목록으로 시작함
  const stored = useSyncExternalStore(subscribeRecent, recentSnapshot, () => EMPTY);
  const recent = useMemo<string[]>(() => {
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  }, [stored]);

  // 목적이 바뀌어도 조건을 잃지 않게 주소마다 kind 를 끌고 감
  const mode = SEARCH_KINDS.find((item) => item.key === kind) ?? SEARCH_KINDS[0];

  const submit = (next: string) => {
    const text = next.trim();
    if (!text) return;

    writeRecent([text, ...recent.filter((item) => item !== text)].slice(0, RECENT_MAX));
    router.push(`/search?kind=${kind}&q=${encodeURIComponent(text)}`);
  };

  const dropRecent = (text: string) => {
    writeRecent(recent.filter((item) => item !== text));
  };

  const clearRecent = () => {
    writeRecent([]);
  };

  // 위치를 알면 가까운 순으로 좁히고 모르면 최근 제보를 그대로 보여 줌
  const here = position.point;
  const around = useMemo(() => {
    if (!here) return nearby.slice(0, NEARBY_FALLBACK);
    return nearby
      .map((item) => ({ item, km: distanceKm(here, item.point) }))
      .filter((row) => row.km <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.km - b.km)
      .map((row) => row.item);
  }, [nearby, here]);

  return (
    <Screen bg="bg.layerBasement">
      <HStack
        gap="x2"
        align="center"
        px="spacingX.globalGutter"
        py="x3"
        bg="bg.layerDefault"
        position="sticky"
        top="0"
        zIndex={1}
      >
        <ActionButton
          variant="ghost"
          size="medium"
          layout="iconOnly"
          aria-label="뒤로"
          onClick={() => router.back()}
        >
          <Icon svg={<IconChevronLeftLine />} />
        </ActionButton>

        <VStack align="stretch" grow={1} minWidth="0">
          <TextField
            aria-label="검색어"
            size="medium"
            prefixIcon={<IconMagnifyingglassLine />}
            value={keyword}
            onValueChange={(next) => setKeyword(next.value)}
          >
            <TextFieldInput
              placeholder={mode.placeholder}
              aria-label="검색어 입력"
              enterKeyHint="search"
              autoFocus
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                submit(keyword);
              }}
            />
          </TextField>
        </VStack>

        <ActionButton
          variant="ghost"
          size="medium"
          layout="iconOnly"
          aria-label="사진으로 찾기"
          onClick={() => setPhotoOpen(true)}
        >
          <Icon svg={<IconCameraLine />} />
        </ActionButton>
      </HStack>

      <VStack align="stretch" gap="x2" pb="x10">
        <SectionCard gap="x3">
          <HStack gap="spacingX.betweenChips">
            {SEARCH_KINDS.map((item) => (
              <Chip.Button
                key={item.key}
                size="medium"
                // Chip.Button 에 선택 상태 prop 이 없어 variant 와 aria-pressed 로 대신함
                variant={item.key === kind ? "solid" : "outlineWeak"}
                aria-pressed={item.key === kind}
                onClick={() =>
                  router.push(
                    `/search?kind=${item.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
                  )
                }
              >
                <Chip.Label>{item.label}</Chip.Label>
              </Chip.Button>
            ))}
          </HStack>

          <Box className="rebirth-scroll-row" mx="-x4" px="x4">
            <HStack gap="spacingX.betweenChips">
              {SHORTCUTS.map((item) => (
                <Chip.Button
                  key={item.label}
                  size="medium"
                  onClick={() => router.push(`/search?kind=${kind}&${item.params}`)}
                >
                  <Chip.Label>{item.label}</Chip.Label>
                </Chip.Button>
              ))}
            </HStack>
          </Box>
        </SectionCard>

        {results ? (
          <SectionCard gap="x3">
            <HStack justify="space-between" align="center">
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                검색 결과
              </Text>
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {results.length}건
              </Text>
            </HStack>

            {results.length === 0 ? (
              <VStack align="stretch" gap="x1">
                <Text textStyle="t4Regular" color="fg.neutralMuted">
                  조건과 맞는 제보가 없습니다
                </Text>
                <Text textStyle="t3Regular" color="fg.neutralSubtle">
                  {kind === "lost"
                    ? "이름이나 특징으로 다시 찾아보세요"
                    : "털색이나 동네처럼 짧은 말로 다시 찾아 주십시오"}
                </Text>
              </VStack>
            ) : (
              <Grid columns={2} gap="x4">
                {results.map((item) => (
                  <ReportCard key={item.id} item={item} />
                ))}
              </Grid>
            )}
          </SectionCard>
        ) : null}

        <SectionCard gap="x3">
          <HStack gap="x2" align="center">
            {CHARTS.map((item) => (
              <Chip.Toggle
                key={item.key}
                size="small"
                checked={chart === item.key}
                onCheckedChange={() => setChart(item.key)}
              >
                <Chip.Label>{item.label}</Chip.Label>
              </Chip.Toggle>
            ))}
          </HStack>
          <TrendingChart items={trending[chart]} help={chart === "help"} />
        </SectionCard>

        {results === null && around.length > 0 ? (
          <SectionCard gap="x3">
            <HStack justify="space-between" align="center">
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                {here ? `내 주변 ${NEARBY_RADIUS_KM}km 제보` : "최근 올라온 제보"}
              </Text>
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {around.length}건
              </Text>
            </HStack>
            <Grid columns={2} gap="x4">
              {around.map((item) => (
                <ReportCard key={item.id} item={item} />
              ))}
            </Grid>
          </SectionCard>
        ) : null}

        {recent.length > 0 ? (
          <SectionCard gap="x2">
            <HStack justify="space-between" align="center">
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                최근 검색
              </Text>
              <ActionButton variant="ghost" size="xsmall" onClick={clearRecent}>
                전체 삭제
              </ActionButton>
            </HStack>

            <VStack align="stretch">
              {recent.map((text, index) => (
                <VStack key={text} align="stretch">
                  {index > 0 ? <Divider /> : null}
                  <HStack gap="x2" align="center" py="x2">
                    <Icon svg={<IconClockLine />} size="x4" color="fg.neutralSubtle" />
                    <VStack asChild align="flex-start" grow={1} minWidth="0">
                      <button type="button" onClick={() => submit(text)}>
                        <Text textStyle="t4Regular" color="fg.neutral" maxLines={1}>
                          {text}
                        </Text>
                      </button>
                    </VStack>
                    <ActionButton
                      variant="ghost"
                      size="xsmall"
                      layout="iconOnly"
                      aria-label={`${text} 지우기`}
                      onClick={() => dropRecent(text)}
                    >
                      <Icon svg={<IconXmarkLine />} />
                    </ActionButton>
                  </HStack>
                </VStack>
              ))}
            </VStack>
          </SectionCard>
        ) : null}
      </VStack>

      <PhotoSearchSheet open={photoOpen} onOpenChange={setPhotoOpen} />
    </Screen>
  );
}
