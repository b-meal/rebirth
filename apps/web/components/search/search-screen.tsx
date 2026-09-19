"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Box, Divider, Grid, HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconCameraLine,
  IconChevronLeftLine,
  IconClockLine,
  IconMagnifyingglassLine,
  IconXmarkLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { distanceKm, type LatLng } from "@rebirth/core/location/geo";

import { sinceLabel } from "@/lib/report-label";
import { useCurrentPosition } from "@/hooks/use-current-position";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
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
  /** 결과의 다음 쪽. 없으면 이 목록이 전부임 */
  resultCursor: string | null;
  trending: Record<ChartKey, TrendingItem[]>;
  nearby: NearbyItem[];
};

/** 이어 읽은 쪽. 목록 API 는 카드가 쓰는 말 대신 원본 시각을 내려 줌 */
type ResultResponse = {
  items: (Omit<ReportCardItem, "sinceLabel" | "kind"> & {
    occurredAt: string;
    kind: string;
  })[];
  nextCursor: string | null;
};

function toCards(rows: ResultResponse["items"]): ReportCardItem[] {
  return rows.map(({ occurredAt, kind, ...rest }) => ({
    ...rest,
    occurredAt,
    sinceLabel: sinceLabel(new Date(occurredAt)),
    kind: kind === "lost" ? ("lost" as const) : ("sighting" as const),
  }));
}

export function SearchScreen({
  query,
  kind,
  results,
  resultCursor,
  trending,
  nearby,
}: SearchScreenProps) {
  const router = useRouter();
  const params = useSearchParams();
  const position = useCurrentPosition({ immediate: true });
  const [keyword, setKeyword] = useState(query);

  // autoFocus 를 HTML 에 박으면 화면이 그려지기 전에 자판이 올라와 내용을 가림
  // 화면이 다 그려진 다음 프레임에 초점을 주고, 결과를 보러 온 진입은 자판이 목록을 덮으므로 주지 않음
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (results !== null) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [results]);
  const [chart, setChart] = useState<ChartKey>("interest");
  const [photoOpen, setPhotoOpen] = useState(false);

  const [extra, setExtra] = useState<ReportCardItem[]>([]);
  const [cursor, setCursor] = useState(resultCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 탭은 화면이 스스로 바꿈. 서버를 다시 부르면 차트와 주변 제보까지 다시 받느라 한참 뒤에 반응함
  // 조건이 없으면 문구만 바뀌고, 조건이 있으면 결과 첫 쪽만 목록 API 로 다시 받음
  const [activeKind, setActiveKind] = useState<SearchKind>(kind);
  const [page, setPage] = useState<{ items: ReportCardItem[]; cursor: string | null } | null>(
    null,
  );
  const [switching, setSwitching] = useState(false);
  const switchTurn = useRef(0);

  // 조건을 바꾸면 서버가 새 쪽을 그려 보냄. 쌓아 둔 것을 비우지 않으면 옛 결과가 남음
  // kind 는 주소만 바꿔도 달라지므로 빼고 봄. 서버가 다시 그렸는지는 나머지 조건으로 앎
  const rest = new URLSearchParams(params.toString());
  rest.delete("kind");
  const drawn = `${kind}|${resultCursor ?? ""}|${results?.length ?? -1}|${rest.toString()}`;
  const [seen, setSeen] = useState(drawn);
  if (seen !== drawn) {
    setSeen(drawn);
    setExtra([]);
    setCursor(resultCursor);
    setLoadError(null);
    setPage(null);
    setActiveKind(kind);
    setSwitching(false);
  }
  // 응답이 돌아왔을 때 서버가 그사이 새로 그렸는지 보는 기준. 렌더 중에는 ref 를 만지지 않음
  const drawnRef = useRef(drawn);
  useEffect(() => {
    drawnRef.current = drawn;
  }, [drawn]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoading(true);
    setLoadError(null);
    try {
      const query = new URLSearchParams(params.toString());
      query.set("kind", activeKind);
      query.set("cursor", cursor);
      const response = await fetch(`/api/reports?${query}`);
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as ResultResponse;
      setExtra((prev) => [...prev, ...toCards(data.items)]);
      setCursor(data.nextCursor);
    } catch {
      setLoadError("더 불러오지 못했어요. 다시 눌러 주세요");
    } finally {
      setLoading(false);
    }
  }, [cursor, params, activeKind]);

  const switchKind = (next: SearchKind) => {
    if (next === activeKind) return;
    setActiveKind(next);
    // 새로고침과 뒤로가기가 고른 탭을 기억하도록 주소만 바꿈. 서버 컴포넌트는 다시 돌지 않음
    const url = new URLSearchParams(params.toString());
    url.set("kind", next);
    window.history.replaceState(window.history.state, "", `/search?${url}`);
    // 조건이 없으면 결과 절이 없어 문구만 바뀜
    if (results === null) return;

    const turn = ++switchTurn.current;
    const startedOn = drawn;
    // 그사이 다른 탭을 눌렀거나 서버가 새로 그렸으면 뒤진 응답임
    const stale = () => switchTurn.current !== turn || drawnRef.current !== startedOn;
    setSwitching(true);
    setLoadError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/reports?${url}`);
        if (!response.ok) throw new Error("switch failed");
        const data = (await response.json()) as ResultResponse;
        if (stale()) return;
        setPage({ items: toCards(data.items), cursor: data.nextCursor });
        setExtra([]);
        setCursor(data.nextCursor);
      } catch {
        if (!stale()) setLoadError("목록을 바꾸지 못했어요. 다시 눌러 주세요");
      } finally {
        if (!stale()) setSwitching(false);
      }
    })();
  };

  // 화면을 떠나면 늦게 온 응답이 상태를 건드리지 않음
  useEffect(() => {
    return () => {
      switchTurn.current += 1;
    };
  }, []);

  const sentinel = useInfiniteScroll({
    // 실패하면 관찰을 끊음. 자동으로 되풀이하면 같은 오류를 계속 부름
    hasMore: Boolean(cursor) && !loadError,
    loading,
    onLoad: () => void loadMore(),
  });

  // 조건이 없으면 결과 절 자체를 그리지 않아 이어 읽은 것도 없음
  const rows = results ? [...(page?.items ?? results), ...extra] : null;

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
  const mode = SEARCH_KINDS.find((item) => item.key === activeKind) ?? SEARCH_KINDS[0];

  // 지름길은 주소의 조건과 같으면 켜져 보이고, 켜진 것을 다시 누르면 그 조건만 풀림
  // 다른 조건과 검색어는 그대로 두어 개 를 고양이 로 바꾸는 식으로 이어 쓸 수 있음
  type Shortcut = (typeof SHORTCUTS)[number];
  const shortcutEntry = (item: Shortcut): [string, string] => {
    const [name, value] = item.params.split("=");
    return [name!, decodeURIComponent(value!)];
  };
  const isShortcutOn = (item: Shortcut) => {
    const [name, value] = shortcutEntry(item);
    return params.get(name) === value;
  };
  const toggleShortcut = (item: Shortcut) => {
    const [name, value] = shortcutEntry(item);
    const next = new URLSearchParams(params.toString());
    if (next.get(name) === value) next.delete(name);
    else next.set(name, value);
    next.set("kind", activeKind);
    router.push(`/search?${next}`);
  };

  // 검색어를 비우면 탭만 남기고 주소의 조건을 털어 처음 진입한 화면으로 돌림
  // 새 자리로 가는 것이 아니라 방금 건 검색을 무르는 것이라 replace 로 둠
  const conditionNames = ["q", "animalType", "size", "colors"] as const;
  const clearConditions = () => {
    if (!conditionNames.some((name) => params.has(name))) return;
    router.replace(`/search?kind=${activeKind}`);
  };

  const submit = (next: string) => {
    const text = next.trim();
    // 공백만 넣고 검색해도 지운 것으로 봄
    if (!text) {
      setKeyword("");
      clearConditions();
      return;
    }

    writeRecent([text, ...recent.filter((item) => item !== text)].slice(0, RECENT_MAX));
    router.push(`/search?kind=${activeKind}&q=${encodeURIComponent(text)}`);
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
          {/* large 라야 글자가 16px 임. medium 은 14px 이라 iOS Safari 가 포커스 때 화면을 확대함 */}
          <TextField
            aria-label="검색어"
            size="large"
            prefixIcon={<IconMagnifyingglassLine />}
            value={keyword}
            onValueChange={(next) => {
              setKeyword(next.value);
              // 마지막 글자를 지우면 따로 검색을 누르지 않아도 처음 화면으로 돌아옴
              if (!next.value) clearConditions();
            }}
          >
            <TextFieldInput
              ref={inputRef}
              placeholder={mode.placeholder}
              aria-label="검색어 입력"
              enterKeyHint="search"
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
            {/* 켜진 쪽이 한눈에 보여야 해 다른 화면과 같은 Toggle 을 씀. Button 의 solid 는 연한 회색이라 구분이 안 됨
                켜진 것을 다시 눌러도 switchKind 가 같은 값이라 그대로 둠 */}
            {SEARCH_KINDS.map((item) => (
              <Chip.Toggle
                key={item.key}
                size="medium"
                checked={item.key === activeKind}
                onCheckedChange={() => switchKind(item.key)}
              >
                <Chip.Label>{item.label}</Chip.Label>
              </Chip.Toggle>
            ))}
          </HStack>

          {/* 음수 마진은 prop 으로 주면 값이 되지 않아 클래스가 맡음. 첫 칩이 위 탭과 같은 선에 섬 */}
          <Box className="rebirth-scroll-row rebirth-bleed">
            <HStack gap="spacingX.betweenChips">
              {SHORTCUTS.map((item) => (
                <Chip.Toggle
                  key={item.label}
                  size="medium"
                  checked={isShortcutOn(item)}
                  onCheckedChange={() => toggleShortcut(item)}
                >
                  <Chip.Label>{item.label}</Chip.Label>
                </Chip.Toggle>
              ))}
            </HStack>
          </Box>
        </SectionCard>

        {rows ? (
          <SectionCard gap="x3">
            <HStack justify="space-between" align="center">
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                검색 결과
              </Text>
              {/* 더 남았으면 지금 그린 수가 전부가 아니라는 것을 함께 알림 */}
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {rows.length}건{cursor ? " 이상" : ""}
              </Text>
            </HStack>

            {/* 탭을 바꿔 새 쪽을 받는 동안 옛 목록은 그대로 두고 목록 한가운데에 표시 하나만 올림
                목록을 비우면 화면이 튀고, 제목 옆에 붙이면 무엇을 기다리는지 눈이 가지 않음 */}
            <Box position="relative" aria-busy={switching}>
              {rows.length === 0 ? (
                switching ? (
                  <HStack justify="center" py="x8">
                    <ProgressCircle size="24" tone="neutral" />
                  </HStack>
                ) : (
                  <VStack align="stretch" gap="x1">
                    <Text textStyle="t4Regular" color="fg.neutralMuted">
                      조건과 맞는 제보가 없어요
                    </Text>
                    <Text textStyle="t3Regular" color="fg.neutralSubtle">
                      {activeKind === "lost"
                        ? "이름이나 특징으로 다시 찾아보세요"
                        : "털색이나 동네처럼 짧은 말로 다시 찾아 주세요"}
                    </Text>
                  </VStack>
                )
              ) : (
                <Grid columns={2} gap="x4">
                  {rows.map((item) => (
                    <ReportCard key={item.id} item={item} />
                  ))}
                </Grid>
              )}
              {switching && rows.length > 0 ? (
                <VStack position="absolute" top="0" right="0" bottom="0" left="0" align="center" aria-hidden>
                  {/* 목록이 화면보다 길어 한가운데는 보이지 않으므로 보이는 구간 가운데에 붙여 둠
                      사진 위에 얹히므로 떠 있는 면 하나를 받쳐 표시가 묻히지 않게 함 */}
                  <Box
                    className="rebirth-list-busy"
                    bg="bg.layerFloating"
                    borderRadius="full"
                    p="x2"
                    boxShadow="s2"
                  >
                    <ProgressCircle size="24" tone="neutral" />
                  </Box>
                </VStack>
              ) : null}
            </Box>

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
