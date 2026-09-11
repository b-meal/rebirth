"use client";

import { useCallback, useState, type UIEvent } from "react";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconCameraFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";

import type { PhotoItem } from "@/lib/image";

// 확정한 사진을 화면 폭 전체로 깔고 그 위에 진행 상태와 다시 찍기를 얹는 자리
// 색은 SEED CSS 변수로만 참조, 사진이 밝아도 글자가 읽히게 위아래로 스크림을 깜

const HEIGHT = "320px";
const SCRIM_HEIGHT = "104px";
const TOP_SCRIM = "linear-gradient(to bottom, var(--seed-color-bg-layer-default), transparent)";
const BOTTOM_SCRIM = "linear-gradient(to top, var(--seed-color-bg-layer-default), transparent)";

// 한 장 폭으로 스냅해 손을 떼면 사진 경계에 멈춤
const SNAP_ROW = { scrollSnapType: "x mandatory" } as const;
const SNAP_ITEM = {
  minWidth: "100%",
  height: "100%",
  objectFit: "cover",
  scrollSnapAlign: "start",
} as const;

export type ReportPhotoHeroProps = {
  photos: PhotoItem[];
  /** 진행 표시에 쓰는 현재 단계와 전체 */
  step: number;
  total: number;
  label: string;
  onRetake: () => void;
};

export function ReportPhotoHero({ photos, step, total, label, onRetake }: ReportPhotoHeroProps) {
  const [active, setActive] = useState(0);

  // 스크롤 위치를 한 장 폭으로 나눠 현재 장을 셈
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const row = event.currentTarget;
    setActive(Math.round(row.scrollLeft / (row.clientWidth || 1)));
  }, []);

  return (
    <Box position="relative" height={HEIGHT} bg="bg.neutralWeak" overflowX="hidden">
      <HStack
        className="rebirth-scroll-row"
        align="stretch"
        height="full"
        onScroll={onScroll}
        style={SNAP_ROW}
      >
        {photos.map((photo, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- blob: 미리보기라 next/image 로 최적화할 대상이 없음
          <img
            key={photo.id}
            src={photo.previewUrl}
            alt={index === 0 ? "대표 사진" : `사진 ${index + 1}`}
            style={SNAP_ITEM}
          />
        ))}
      </HStack>

      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        height={SCRIM_HEIGHT}
        style={{ background: TOP_SCRIM, pointerEvents: "none" }}
      />
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        height={SCRIM_HEIGHT}
        style={{ background: BOTTOM_SCRIM, pointerEvents: "none" }}
      />

      {/* 오버레이가 스와이프를 먹지 않게 통과시키고 버튼만 다시 받음 */}
      <VStack
        position="absolute"
        top="0"
        right="0"
        bottom="0"
        left="0"
        align="stretch"
        justify="space-between"
        px="spacingX.globalGutter"
        py="x5"
        style={{ pointerEvents: "none" }}
      >
        <VStack align="stretch" gap="x2">
          <Box height="x1" borderRadius="full" bg="bg.neutralWeak" overflowX="hidden">
            <Box
              height="x1"
              borderRadius="full"
              bg="bg.brandSolid"
              width={`${(step / total) * 100}%`}
            />
          </Box>
          <HStack justify="space-between" align="center">
            <Text textStyle="t3Medium" color="fg.neutral">
              {step} / {total} · {label}
            </Text>
            <Box style={{ pointerEvents: "auto" }}>
              <ActionButton variant="neutralSolid" size="small" onClick={onRetake}>
                <Icon svg={<IconCameraFill />} />
                다시 찍기
              </ActionButton>
            </Box>
          </HStack>
        </VStack>

        {photos.length > 1 ? (
          <HStack justify="center" gap="x1_5">
            {photos.map((photo, index) => (
              <Box
                key={photo.id}
                width="x1_5"
                height="x1_5"
                borderRadius="full"
                bg={index === active ? "fg.neutral" : "bg.neutralWeak"}
              />
            ))}
          </HStack>
        ) : null}
      </VStack>
    </Box>
  );
}
