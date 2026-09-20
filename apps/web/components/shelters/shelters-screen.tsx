"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Skeleton } from "@seed-design/react";

import { ProgressCircle } from "seed-design/ui/progress-circle";

import { Screen, ScreenBody, SectionCard } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { useCurrentPosition } from "@/hooks/use-current-position";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { ShelterList, type ShelterItem } from "@/components/shelters/shelter-row";

// 어디에 맡길지 모르는 사람이 제보 전에도 볼 수 있는 화면
// 위치를 주면 가까운 순, 주지 않으면 시도를 골라 목록으로 봄
// 목록 끝에 닿기 전에 다음 쪽을 미리 받아 손을 멈추지 않고 이어 읽힘

const LIMIT = 20;

// 사용자가 직접 고르기 전에는 null. 위치 결과에 따라 화면이 갈림
type Mode = "region" | null;

export function SheltersScreen({ regions }: { regions: string[] }) {
  const position = useCurrentPosition();
  const requestPosition = position.request;
  const [mode, setMode] = useState<Mode>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [items, setItems] = useState<ShelterItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 화면에 들어오면 바로 위치를 물음. 거부해도 지역 고르기로 이어짐
  useEffect(() => {
    requestPosition();
  }, [requestPosition]);

  // 위치를 못 얻으면 지역 고르기로 넘어감. effect 에서 상태를 바꾸지 않고 파생시킴
  const positionFailed =
    position.status === "denied" ||
    position.status === "timeout" ||
    position.status === "unavailable";
  const byRegion = mode === "region" || positionFailed;

  // 지금 무엇을 기준으로 보는지. 아직 고를 것이 남았으면 null
  const basis = byRegion
    ? region
      ? `region=${encodeURIComponent(region)}`
      : null
    : position.point
      ? `lat=${position.point.lat}&lng=${position.point.lng}`
      : null;

  // 기준이 바뀌면 쌓아 둔 목록을 버림. 남겨 두면 다른 지역 기관이 위에 붙은 채로 이어 읽음
  const [seen, setSeen] = useState(basis);
  if (seen !== basis) {
    setSeen(basis);
    setItems(null);
    setFailed(false);
    setHasMore(false);
  }

  // 한 쪽을 받아 오기만 함. 상태는 부르는 쪽이 다뤄 effect 안에서 동기 setState 가 되지 않음
  const fetchPage = useCallback(async (query: string, skip: number) => {
    try {
      const response = await fetch(`/api/shelters?${query}&limit=${LIMIT}&offset=${skip}`);
      if (!response.ok) throw new Error("shelters");
      return (await response.json()) as { items: ShelterItem[]; hasMore: boolean };
    } catch {
      return null;
    }
  }, []);

  // 기준이 정해지면 첫 쪽을 읽음. 상태 변경을 then 안에 두어 effect 안의 동기 setState 를 피함
  useEffect(() => {
    if (!basis) return;
    let cancelled = false;

    void fetchPage(basis, 0).then((body) => {
      if (cancelled) return;
      setItems(body ? body.items : []);
      setHasMore(body ? body.hasMore : false);
      setFailed(!body);
    });

    return () => {
      cancelled = true;
    };
  }, [basis, fetchPage]);

  const loadMore = useCallback(() => {
    if (!basis || !items) return;
    setLoadingMore(true);
    void fetchPage(basis, items.length).then((body) => {
      setLoadingMore(false);
      if (!body) {
        setFailed(true);
        setHasMore(false);
        return;
      }
      setItems((prev) => [...(prev ?? []), ...body.items]);
      setHasMore(body.hasMore);
    });
  }, [basis, items, fetchPage]);

  const sentinel = useInfiniteScroll({
    // 실패하면 관찰을 끊음. 자동으로 되풀이하면 같은 오류를 계속 부름
    hasMore: hasMore && !failed,
    loading: loadingMore,
    onLoad: loadMore,
  });

  const loading = items === null && !failed && !byRegion && !position.point;

  return (
    <Screen>
      <AppHeader title="보호, 구조 기관" />
      <ScreenBody gap="x5">
        <VStack align="stretch" gap="x2">
          <Text as="h2" textStyle="t8Bold" color="fg.neutral">
            어디에 맡겨야 할지 모르겠나요
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            동물보호센터와 야생동물구조센터에 먼저 물어보세요
          </Text>
        </VStack>

        {byRegion ? (
          <VStack align="stretch" gap="x2">
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              지역을 고르세요
            </Text>
            <HStack gap="x2" flexWrap="wrap">
              {regions.map((name) => (
                <ActionButton
                  key={name}
                  size="small"
                  variant={region === name ? "neutralSolid" : "neutralOutline"}
                  onClick={() => setRegion(name)}
                >
                  {name.replace(/(특별자치시|특별자치도|광역시|특별시|도)$/, "")}
                </ActionButton>
              ))}
            </HStack>
          </VStack>
        ) : null}

        {position.error && byRegion ? (
          <Callout tone="informative" description={position.error} />
        ) : null}

        {loading ? (
          <SectionCard gap="x3">
            <Skeleton height="x12" />
            <Skeleton height="x12" />
            <Skeleton height="x12" />
          </SectionCard>
        ) : null}

        {items && items.length > 0 ? (
          <SectionCard gap="x3">
            <ShelterList items={items} />

            {/* 목록 끝에 닿기 전에 다음 쪽을 미리 부르는 표식
                보이지 않지만 자리를 차지해야 관찰자가 걸림 */}
            {hasMore && !failed ? <Box ref={sentinel} height="x1" /> : null}

            {/* 불러오는 동안만 표시를 둠. 미리 불러 두면 대개 보이지 않고 지나감 */}
            {loadingMore ? (
              <HStack justify="center" py="x2">
                <ProgressCircle size="24" tone="neutral" />
              </HStack>
            ) : null}

            {/* 이어 읽다 실패하면 이미 받은 목록은 남기고 그 아래에서만 알림 */}
            {failed ? (
              <Callout
                tone="neutral"
                description="기관을 더 불러오지 못했어요. 잠시 후에 다시 시도해 주세요"
              />
            ) : null}

            <Text textStyle="t2Regular" color="fg.neutralSubtle">
              공공데이터포털 동물보호센터, 야생동물구조센터 정보
            </Text>
          </SectionCard>
        ) : null}

        {items && items.length === 0 ? (
          <Callout
            tone="neutral"
            description={
              failed
                ? "기관을 불러오지 못했어요. 잠시 후에 다시 시도해 주세요"
                : "이 지역에 등록된 기관이 없어요"
            }
          />
        ) : null}

        {!byRegion ? (
          <HStack justify="center">
            <ActionButton
              variant="ghost"
              size="medium"
              onClick={() => {
                setMode("region");
                setItems(null);
              }}
            >
              지역으로 찾을게요
            </ActionButton>
          </HStack>
        ) : null}
      </ScreenBody>
    </Screen>
  );
}
