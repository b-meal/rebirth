"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AspectRatio,
  Box,
  HStack,
  Icon,
  ImageFrame,
  Skeleton,
  Text,
  VStack,
} from "@seed-design/react";
import {
  IconAndroidshareLine,
  IconChevronLeftLine,
  IconHouseLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { ContextualFloatingButton } from "seed-design/ui/contextual-floating-button";

// 상세 첫 화면을 채우는 사진과 그 위에 겹치는 이동 버튼
// 사진은 비공개 버킷이라 서명 URL 로만 열리고 만료되면 다시 받아야 함
// 발견 제보와 실종 신고가 같은 로딩·만료 처리를 써야 해 한 자리에 둠

type PhotoState = "loading" | "ready" | "expired";

type Outcome = { state: "ready" | "expired"; url: string | null };

export type DetailPhotoHeroProps = {
  reportId: string;
  /** 화면 낭독기가 읽는 설명. 발견과 실종이 다른 말을 씀 */
  alt: string;
  onShare: () => void;
};

export function DetailPhotoHero({ reportId, alt, onShare }: DetailPhotoHeroProps) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<PhotoState>("loading");

  // 서명 URL 을 받아옴, 상태 갱신은 응답이 온 뒤에만 해 렌더 연쇄를 만들지 않음
  const loadPhoto = useCallback(async (): Promise<Outcome> => {
    try {
      const response = await fetch(`/api/reports/${reportId}/photo`);
      if (!response.ok) return { state: "expired", url: null };

      const body = (await response.json()) as { photos?: { url: string }[] };
      const first = body.photos?.[0]?.url;
      if (!first) return { state: "expired", url: null };

      return { state: "ready", url: first };
    } catch {
      return { state: "expired", url: null };
    }
  }, [reportId]);

  const apply = useCallback((outcome: Outcome) => {
    setPhotoUrl(outcome.url);
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
      ) : photoState === "ready" && photoUrl ? (
        <ImageFrame src={photoUrl} alt={alt} ratio={4 / 3} width="full" />
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
