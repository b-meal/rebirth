"use client";

import { useEffect, useState } from "react";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconMapLocationpinLine } from "@karrotmarket/react-monochrome-icon";
import { Marker } from "maplibre-gl";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import type { LatLng } from "@rebirth/core/location/geo";

import { useMap } from "@/hooks/use-map";
import {
  MAP_PROVIDERS,
  PROVIDER_LABEL,
  openDirections,
  type MapProvider,
} from "@/lib/map-link";

// 상세 화면의 위치 미리보기, 격자 좌표만 받아 손조작 없는 지도로 보여 줌
// 도착지 이름을 받으면 눌러서 지도 앱 길찾기로 넘어감

// 글 안에 끼운 지도라 한 화면에서 주변 도로가 보이는 정도로만 당김
const PREVIEW_ZOOM = 15;

const PREVIEW_HEIGHT = "160px";

// 지도 오버레이는 React 밖에서 그려지므로 색은 SEED CSS 변수로만 참조
const SPOT_PIN = [
  "width:20px",
  "height:20px",
  "border-radius:9999px",
  "background:var(--seed-color-bg-brand-solid)",
  "border:3px solid var(--seed-color-bg-layer-floating)",
  "box-shadow:0 0 0 8px var(--seed-color-bg-brand-weak)",
].join(";");

export type ReportLocationMapProps = {
  /** 격자 스냅한 공개용 좌표, 정확한 목격 지점이 아님 */
  point: LatLng;
  gridMeters: number;
  /**
   * 지도 앱에 넘길 도착지 이름
   * 없으면 눌러도 아무 일이 없음. 내가 지금 있는 곳을 보는 화면이 그 경우
   */
  destinationName?: string;
};

export function ReportLocationMap({
  point,
  gridMeters,
  destinationName,
}: ReportLocationMapProps) {
  const { containerRef, status, map } = useMap({
    center: point,
    zoom: PREVIEW_ZOOM,
    interactive: false,
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!map) return;
    const dot = document.createElement("div");
    dot.setAttribute("style", SPOT_PIN);
    const marker = new Marker({ element: dot, anchor: "center" })
      .setLngLat([point.lng, point.lat])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, point]);

  if (status === "error") return null;

  const go = (provider: MapProvider) => {
    if (!destinationName) return;
    setSheetOpen(false);
    openDirections(provider, { lat: point.lat, lng: point.lng, name: destinationName });
  };

  // MapLibre 가 컨테이너에 position relative 를 걸어 크기 잡는 요소를 따로 둠
  // 누르는 자리일 때는 지도 캔버스가 탭을 먼저 먹지 않게 비켜 둠
  const canvas = (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        ...(destinationName && { pointerEvents: "none" as const }),
      }}
    />
  );

  return (
    <VStack align="stretch" gap="x1_5">
      <Box
        position="relative"
        height={PREVIEW_HEIGHT}
        borderRadius="r3"
        overflowX="hidden"
        overflowY="hidden"
        bg="bg.neutralWeak"
        {...(destinationName && { asChild: true })}
      >
        {destinationName ? (
          <button
            type="button"
            className="rebirth-map-tap"
            aria-label={`${destinationName}까지 길찾기`}
            onClick={() => setSheetOpen(true)}
          >
            {canvas}
            {/* 누를 수 있는 자리임을 알리는 알약. 지도 탭을 가로채지 않게 비켜 둠 */}
            {/* 지도가 오른쪽 아래에 출처 표기를 두므로 왼쪽에 붙임 */}
            <VStack
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              justify="flex-end"
              align="flex-start"
              p="x2"
              style={{ pointerEvents: "none" }}
            >
              <HStack
                gap="x1"
                align="center"
                px="x2_5"
                py="x1_5"
                borderRadius="full"
                bg="bg.layerFloating"
                boxShadow="s2"
              >
                <Icon svg={<IconMapLocationpinLine />} size="x4" color="fg.neutral" />
                <Text textStyle="t2Bold" color="fg.neutral">
                  길찾기
                </Text>
              </HStack>
            </VStack>
          </button>
        ) : (
          canvas
        )}
      </Box>

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        제보자와 동물 보호를 위해 {gridMeters}m 격자로 넓힌 위치예요
      </Text>

      <BottomSheetRoot open={sheetOpen} onOpenChange={setSheetOpen}>
        <BottomSheetContent title="길찾기">
          <BottomSheetBody>
            <VStack align="stretch" gap="x4">
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                지금 있는 곳에서 이 지점까지 안내해요. 격자로 넓힌 위치라 정확한 지점은
                아니에요
              </Text>
              <VStack align="stretch" gap="x2">
                {MAP_PROVIDERS.map((provider) => (
                  <ActionButton
                    key={provider}
                    variant="neutralWeak"
                    size="large"
                    onClick={() => go(provider)}
                  >
                    {PROVIDER_LABEL[provider]}
                  </ActionButton>
                ))}
              </VStack>
            </VStack>
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheetRoot>
    </VStack>
  );
}
