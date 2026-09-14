"use client";

import { useCallback, useEffect, useState } from "react";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Skeleton } from "@seed-design/react";

import { Screen, ScreenBody, SectionCard } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { useCurrentPosition } from "@/hooks/use-current-position";
import { ShelterList, type ShelterItem } from "@/components/shelters/shelter-row";

// 어디에 맡길지 모르는 사람이 제보 전에도 볼 수 있는 화면
// 위치를 주면 가까운 순, 주지 않으면 시도를 골라 목록으로 봄

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

  // 상태 변경을 then 안에 두어야 effect 안에서 동기 setState 가 되지 않음
  const load = useCallback((query: string) => {
    let cancelled = false;

    void fetch(`/api/shelters?${query}`)
      .then((response) =>
        response.ok ? (response.json() as Promise<{ items: ShelterItem[] }>) : null,
      )
      .then((body) => {
        if (cancelled) return;
        if (body) {
          setItems(body.items);
          setFailed(false);
        } else {
          setItems([]);
          setFailed(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (byRegion || !position.point) return;
    return load(`lat=${position.point.lat}&lng=${position.point.lng}&limit=${LIMIT}`);
  }, [byRegion, position.point, load]);

  useEffect(() => {
    if (!byRegion || !region) return;
    return load(`region=${encodeURIComponent(region)}&limit=${LIMIT}`);
  }, [byRegion, region, load]);

  const loading = items === null && !failed && !byRegion && !position.point;

  return (
    <Screen>
      <AppHeader title="보호, 구조 기관" />
      <ScreenBody gap="x5">
        <VStack align="stretch" gap="x2">
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
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
                ? "기관을 불러오지 못했습니다. 잠시 후에 다시 시도해 주십시오"
                : "이 지역에 등록된 기관이 없습니다"
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
