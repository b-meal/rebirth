"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AspectRatio, Box, Icon, ImageFrame, Skeleton, Text, VStack } from "@seed-design/react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";

import { CARE_LABEL, describeAnimal } from "@/lib/report-label";
import { ReportBadges } from "@/components/report/report-badges";
import type { MapMarker } from "@/components/home/home-screen";

// 핀에서 펼쳐지는 말풍선, 상세로 넘기기 전에 상세와 같은 공개 API 로 요약만 보여 줌

// 지도에서 넘어온 값으로 먼저 그리고 이 필드만 API 응답으로 채움
type Detail = {
  breedGuess: string | null;
  appearance: string | null;
};

// 390px 화면에서 좌우 여백이 남는 폭
const CARD_WIDTH = "232px";

// 흐림과 반투명이 SEED prop 에 없고 지도 위 가독성도 필요해 면 토큰을 섞어 씀
const GLASS = {
  background: "color-mix(in srgb, var(--seed-color-bg-layer-floating) 76%, transparent)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
} as const;

export type MapPreviewCardProps = {
  item: MapMarker;
  onClose: () => void;
};

export function MapPreviewCard({ item, onClose }: MapPreviewCardProps) {
  const [detail, setDetail] = useState<Detail | null>(null);

  // 핀이 바뀌면 부르는 쪽이 key 로 다시 마운트해 상태를 비움
  useEffect(() => {
    let cancelled = false;

    // 상세 화면과 같은 경로를 불러 문구가 갈리지 않게 함
    void fetch(`/api/reports/${item.id}`)
      .then((response) => (response.ok ? (response.json() as Promise<Detail>) : null))
      .then((body) => {
        if (!cancelled && body) {
          setDetail({ breedGuess: body.breedGuess, appearance: body.appearance });
        }
      })
      .catch(() => {
        // 미리보기라 실패하면 지도에서 받은 값만 보여 줌
      });

    return () => {
      cancelled = true;
    };
  }, [item.id]);

  return (
    <VStack
      align="stretch"
      width={CARD_WIDTH}
      borderRadius="r4"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.layerFloating"
      boxShadow="s3"
      overflowX="hidden"
      overflowY="hidden"
      style={GLASS}
    >
      <Box position="relative">
        {item.photoUrl ? (
          <ImageFrame ratio={16 / 9} width="full" src={item.photoUrl} alt={describeAnimal(item)} />
        ) : (
          <AspectRatio ratio={16 / 9} bg="bg.neutralWeak">
            <Box />
          </AspectRatio>
        )}
        <Box position="absolute" top="0" right="0" p="x1_5">
          <ActionButton variant="neutralWeak" size="xsmall" layout="iconOnly" onClick={onClose}>
            <Icon svg={<IconXmarkLine />} />
          </ActionButton>
        </Box>
      </Box>

      <VStack align="stretch" gap="x1_5" p="x3">
        <ReportBadges
          animalType={item.animalType}
          breedGuess={detail?.breedGuess ?? null}
          size={item.size}
          careSituation={item.careSituation}
          injury={item.injury}
        />

        <Text textStyle="t5Bold" color="fg.neutral" maxLines={1}>
          {describeAnimal(item)}
        </Text>
        <Text textStyle="t2Regular" color="fg.neutralMuted" maxLines={1}>
          {item.areaName ?? "지역 미확인"} · {item.sinceLabel} ·{" "}
          {CARE_LABEL[item.careSituation] ?? ""}
        </Text>

        {detail ? (
          <Text textStyle="t3Regular" color="fg.neutral" maxLines={2}>
            {detail.appearance ?? "외형 설명이 없습니다"}
          </Text>
        ) : (
          <Skeleton width="full" height="x8" radius="8" />
        )}

        <ActionButton variant="brandSolid" size="medium" asChild>
          <Link href={`/r/${item.id}`}>상세 보기</Link>
        </ActionButton>
      </VStack>
    </VStack>
  );
}
