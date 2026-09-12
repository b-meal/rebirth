"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { IconPencilLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { FloatingActionButton } from "seed-design/ui/floating-action-button";
import { ResultSection } from "seed-design/ui/result-section";

import { COMMUNITY_CATEGORIES } from "@rebirth/core/community";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { PostCard, type PostCardItem } from "./post-card";

// 커뮤니티 피드. 주제 탭으로 좁히고 커서로 이어 읽음
// 주제는 core 의 COMMUNITY_CATEGORIES 하나에서 오므로 이 화면은 주제를 모름

export type CommunityFeedProps = {
  items: PostCardItem[];
  nextCursor: string | null;
};

export function CommunityFeed({ items, nextCursor }: CommunityFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [extra, setExtra] = useState<PostCardItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const category = params.get("category");

  // 조건을 URL 에 담아 상세에서 뒤로 왔을 때 그대로 복원됨
  const setCategory = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (next.get("category") === value) next.delete("category");
    else next.set("category", value);
    // 주제를 바꾸면 이어 읽던 자리는 뜻을 잃음
    setExtra([]);
    setCursor(null);
    startTransition(() => {
      router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  };

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const query = new URLSearchParams(params.toString());
      query.set("cursor", cursor);
      const response = await fetch(`/api/community?${query}`);
      if (!response.ok) throw new Error("list");
      const data = (await response.json()) as {
        items: (Omit<PostCardItem, "createdAt"> & { createdAt: string })[];
        nextCursor: string | null;
      };
      // JSON 을 거치며 날짜가 문자열이 되므로 화면이 쓰는 모양으로 되돌림
      setExtra((current) => [
        ...current,
        ...data.items.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        })),
      ]);
      setCursor(data.nextCursor);
    } catch {
      // 자동으로 다시 부르지 않고 사용자가 누를 때만 재시도함
      setLoadError("더 불러오지 못했습니다. 다시 시도해 주십시오");
    } finally {
      setLoadingMore(false);
    }
  };

  const rows = [...items, ...extra];

  return (
    // 떠 있는 버튼이 화면 밖이 아니라 이 프레임 기준으로 붙게 함
    <Screen position="relative">
      <ScreenBody gap="x5">
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          커뮤니티
        </Text>

        <Text textStyle="t3Regular" color="fg.neutralMuted">
          제보로 올리기엔 확실하지 않은 이야기도 이웃과 나눠 주십시오
        </Text>

        <HStack gap="spacingX.betweenChips" wrap>
          {COMMUNITY_CATEGORIES.map((option) => (
            <Chip.Toggle
              key={option.id}
              checked={category === option.id}
              onCheckedChange={() => setCategory(option.id)}
            >
              <Chip.Label>{option.label}</Chip.Label>
            </Chip.Toggle>
          ))}
        </HStack>

        <Text textStyle="t3Regular" color="fg.neutralMuted">
          {pending ? "불러오는 중" : `${rows.length}건`}
        </Text>

        {rows.length === 0 ? (
          <ResultSection
            size="medium"
            title="아직 글이 없습니다"
            description="첫 글을 남겨 이웃과 이야기를 시작해 주십시오"
            primaryActionProps={{
              children: "글쓰기",
              onClick: () => router.push("/community/new"),
            }}
          />
        ) : (
          <VStack align="stretch" gap="x2">
            {rows.map((item) => (
              <PostCard key={item.id} item={item} />
            ))}
          </VStack>
        )}

        {loadError ? <Callout tone="critical" description={loadError} /> : null}

        {cursor ? (
          <ActionButton
            variant="neutralOutline"
            size="large"
            loading={loadingMore}
            onClick={loadMore}
          >
            더 보기
          </ActionButton>
        ) : rows.length > 0 ? (
          <Text textStyle="t2Regular" color="fg.neutralSubtle" align="center">
            마지막 글까지 모두 보셨습니다
          </Text>
        ) : null}

        {/* 떠 있는 글쓰기 버튼이 마지막 글을 가리지 않도록 여백을 둠 */}
        <Box height="x16" />
      </ScreenBody>

      {/* 홈의 제보하기와 같은 자리. 읽다가 쓰고 싶어진 순간에 손이 닿는 곳에 둠 */}
      {/* 스크롤해도 남아야 하고 프레임 밖으로 나가면 안 돼 화면 끝에 붙여 둠 */}
      {/* bottom 은 토큰 이름을 받지 않아 0 으로 붙이고 띄우는 높이는 안쪽 여백으로 줌 */}
      <HStack
        position="sticky"
        bottom="0"
        justify="flex-end"
        px="spacingX.globalGutter"
        pb="x5"
        zIndex={2}
      >
        <FloatingActionButton
          icon={<IconPencilLine />}
          label="글쓰기"
          onClick={() => router.push("/community/new")}
        />
      </HStack>
    </Screen>
  );
}
