"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AspectRatio,
  Box,
  HStack,
  Icon,
  Skeleton,
  Text,
  VStack,
} from "@seed-design/react";
import {
  IconAndroidshareLine,
  IconChevronLeftLine,
  IconHouseLine,
  IconPawprintFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { ContextualFloatingButton } from "seed-design/ui/contextual-floating-button";

import { PhotoCarousel } from "@/components/ui/photo-carousel";

// 상세 첫 화면을 채우는 사진과 그 위에 겹치는 이동 버튼
// 사진은 비공개 버킷이라 서명 URL 로만 열리고 만료되면 다시 받아야 함
// 발견 제보와 실종 신고가 같은 로딩·만료 처리를 써야 해 한 자리에 둠
// 여러 장이면 옆으로 넘기고 누르면 전체 화면으로 열림. 그 일은 PhotoCarousel 이 함

type PhotoState = "loading" | "ready" | "empty" | "expired";

type Outcome = { state: "ready" | "empty" | "expired"; urls: string[] };

export type DetailPhotoHeroProps = {
  reportId: string;
  /** 화면 낭독기가 읽는 설명. 발견과 실종이 다른 말을 씀 */
  alt: string;
  onShare: () => void;
};

export function DetailPhotoHero({ reportId, alt, onShare }: DetailPhotoHeroProps) {
  const router = useRouter();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoState, setPhotoState] = useState<PhotoState>("loading");

  // 서명 URL 을 받아옴, 상태 갱신은 응답이 온 뒤에만 해 렌더 연쇄를 만들지 않음
  const loadPhoto = useCallback(async (): Promise<Outcome> => {
    try {
      const response = await fetch(`/api/reports/${reportId}/photo`);
      if (!response.ok) return { state: "expired", urls: [] };

      // 올린 순서를 지켜야 대표 사진이 첫 장으로 서고 넘긴 순서가 상세와 같아짐
      const body = (await response.json()) as { photos?: { url: string; sortOrder?: number }[] };
      const urls = [...(body.photos ?? [])]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((photo) => photo.url);
      // 사진 없이 올린 신고도 있어 0장을 만료로 말하면 거짓이 됨
      if (urls.length === 0) return { state: "empty", urls: [] };

      return { state: "ready", urls };
    } catch {
      return { state: "expired", urls: [] };
    }
  }, [reportId]);

  const apply = useCallback((outcome: Outcome) => {
    setPhotoUrls(outcome.urls);
    setPhotoState(outcome.state);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadPhoto().then((outcome) => {
      if (!cancelled) apply(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [loadPhoto, apply]);

  return (
    <Box position="relative">
      {photoState === "loading" ? (
        <Skeleton width="full" height="320px" radius="0" />
      ) : photoState === "ready" && photoUrls.length > 0 ? (
        <PhotoCarousel urls={photoUrls} fullBleed alt={alt} />
      ) : photoState === "empty" ? (
        <AspectRatio ratio={4 / 3} bg="bg.neutralWeak">
          <VStack align="center" justify="center" gap="x2" px="spacingX.globalGutter">
            <Icon svg={<IconPawprintFill />} size="x10" color="fg.neutralSubtle" />
            <Text textStyle="t4Regular" color="fg.neutralMuted">
              사진 없이 올린 기록이에요
            </Text>
          </VStack>
        </AspectRatio>
      ) : (
        <AspectRatio ratio={4 / 3} bg="bg.neutralWeak">
          <VStack align="center" justify="center" gap="x2" px="spacingX.globalGutter">
            <Text textStyle="t4Regular" color="fg.neutralMuted">
              사진 주소가 만료됐어요
            </Text>
            <ActionButton
              variant="neutralOutline"
              size="small"
              onClick={() => {
                setPhotoState("loading");
                void loadPhoto().then(apply);
              }}
            >
              다시 불러오기
            </ActionButton>
          </VStack>
        </AspectRatio>
      )}

      <HStack
        position="absolute"
        top="0"
        left="0"
        right="0"
        px="spacingX.globalGutter"
        pt="x3"
        justify="space-between"
        align="center"
      >
        <ContextualFloatingButton
          variant="layer"
          layout="iconOnly"
          aria-label="뒤로"
          onClick={() => router.back()}
        >
          <Icon svg={<IconChevronLeftLine />} />
        </ContextualFloatingButton>
        <HStack gap="x2" align="center">
          <ContextualFloatingButton variant="layer" layout="iconOnly" aria-label="홈으로" asChild>
            <Link href="/" aria-label="홈으로">
              <Icon svg={<IconHouseLine />} />
            </Link>
          </ContextualFloatingButton>
          <ContextualFloatingButton
            variant="layer"
            layout="iconOnly"
            aria-label="공유하기"
            onClick={onShare}
          >
            <Icon svg={<IconAndroidshareLine />} />
          </ContextualFloatingButton>
        </HStack>
      </HStack>
    </Box>
  );
}
