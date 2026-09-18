"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AspectRatio, Box, HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import {
  IconDot3HorizontalChatbubbleLeftLine,
  IconFireworkLine,
  IconHeartLine,
  IconLocationpinLine,
  IconPencilLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { FloatingActionButton } from "seed-design/ui/floating-action-button";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { ResultSection } from "seed-design/ui/result-section";

import { COMMUNITY_CATEGORIES } from "@rebirth/core/community";

import { useNeighborhood } from "@/components/location/neighborhood-provider";
import { AppHeader } from "@/components/ui/app-header";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { ComposeSheet } from "./compose-sheet";
import { PostCard, type PostCardItem } from "./post-card";

// 커뮤니티 피드. 주제 탭으로 좁히고 커서로 이어 읽음
// 주제는 core 의 COMMUNITY_CATEGORIES 하나에서 오므로 이 화면은 주제를 모름
// 동네를 알면 내 동네 글을 먼저 보여 줌
// 지난번에 알아낸 동네가 쿠키에 있으면 서버가 이미 그렇게 그려 보내므로 다시 읽지 않음
// 처음 오는 사람은 서버가 동네를 몰라 전국 목록을 그리고, 위치를 잡은 뒤 한 번 다시 읽음

/** 동네 이름이 들어올 자리. 양재2동 같은 네 글자에 맞춰 두어 값이 와도 줄이 들썩이지 않음 */
const AREA_SKELETON_WIDTH = "4.5rem";

/** 이웃 글을 먼저 보여 줘요 가 들어올 자리 */
const NOTE_SKELETON_WIDTH = "9.5rem";

/** 반응 많은 글을 세울 최소 목록 길이. 골라 세운 수의 곱절은 돼야 같은 글이 두 번 보이지 않음 */
const MIN_FOR_HOT = 12;

/** 가로줄에 세울 장 수. 세 장은 한 화면에 거의 다 들어와 밀어도 멈춘 것처럼 보임 */
const HOT_COUNT = 6;

/** 가로 카드 한 장 폭. 두 장 반이 보여 더 있다는 것이 드러남 */
const HOT_WIDTH = "132px";

/** 가로로 넘겨 보는 글 한 장 */
function HotCard({ item }: { item: PostCardItem }) {
  return (
    <VStack asChild align="stretch" gap="x2" width={HOT_WIDTH} minWidth={HOT_WIDTH}>
      <Link href={`/community/${item.id}`}>
        {item.photoUrl ? (
          <ImageFrame ratio={1} src={item.photoUrl} alt="" borderRadius="r3" />
        ) : (
          // 사진 없는 글도 같은 자리를 차지해 줄이 들쭉날쭉해지지 않음
          <AspectRatio ratio={1} borderRadius="r3" bg="bg.neutralWeak">
            <VStack align="center" justify="center" height="full">
              <Icon svg={<IconPencilLine />} size="x6" color="fg.neutralSubtle" />
            </VStack>
          </AspectRatio>
        )}
        <Text textStyle="t3Bold" color="fg.neutral" maxLines={2}>
          {item.title}
        </Text>
        <HStack gap="x2" align="center">
          <HStack gap="x1" align="center">
            <Icon svg={<IconHeartLine />} size="x3_5" color="fg.neutralSubtle" />
            <Text textStyle="t2Regular" color="fg.neutralSubtle">
              {item.likeCount}
            </Text>
          </HStack>
          <HStack gap="x1" align="center">
            <Icon
              svg={<IconDot3HorizontalChatbubbleLeftLine />}
              size="x3_5"
              color="fg.neutralSubtle"
            />
            <Text textStyle="t2Regular" color="fg.neutralSubtle">
              {item.commentCount}
            </Text>
          </HStack>
        </HStack>
      </Link>
    </VStack>
  );
}

/** 지금 목록 안에서 반응이 많은 순. 서버가 따로 세는 값이 아니라 이 쪽 기준 */
function pickHot(rows: PostCardItem[]): PostCardItem[] {
  if (rows.length < MIN_FOR_HOT) return [];
  return rows
    .filter((item) => item.likeCount + item.commentCount > 0)
    .toSorted(
      (a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount),
    )
    .slice(0, HOT_COUNT);
}

export type CommunityFeedProps = {
  items: PostCardItem[];
  nextCursor: string | null;
  /** 서버가 이 동네로 이미 그렸으면 그 이름. 모르고 그렸으면 null */
  areaName: string | null;
  /** 서버가 보낸 목록에서 앞 몇 건이 내 동네 글인지 */
  nearCount: number;
};

/** 목록 API 응답. 날짜는 JSON 을 거치며 문자열이 됨 */
type FeedResponse = {
  items: (Omit<PostCardItem, "createdAt"> & { createdAt: string })[];
  nextCursor: string | null;
  nearCount?: number;
};

function toItems(rows: FeedResponse["items"]): PostCardItem[] {
  return rows.map((item) => ({ ...item, createdAt: new Date(item.createdAt) }));
}

export function CommunityFeed({
  items,
  nextCursor,
  areaName: serverArea,
  nearCount: serverNearCount,
}: CommunityFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [extra, setExtra] = useState<PostCardItem[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // 동네로 다시 읽은 목록. null 이면 서버가 그린 목록을 그대로 씀
  const [local, setLocal] = useState<PostCardItem[] | null>(null);
  // 동네를 새로 잡은 뒤 그 동네 목록을 받아 오는 동안. 배너가 바뀔 값을 미리 비워 둠
  const [reloading, setReloading] = useState(false);
  // 내 동네 글이 몇 번째까지인지. 그 뒤부터 다른 동네라 구분선을 놓음
  const [nearCount, setNearCount] = useState(serverNearCount);

  // 서버가 새 쪽을 그려 보내면 쌓아 둔 것을 버리고 그 쪽에서 다시 시작함
  // 주제를 바꿀 때가 이 경우라, 옛 커서와 옛 수가 남아 구분선이 사라지지 않음
  const serverPage = `${nextCursor ?? ""}|${serverNearCount}|${items.length}`;
  const [drawn, setDrawn] = useState(serverPage);
  if (drawn !== serverPage) {
    setDrawn(serverPage);
    setExtra([]);
    setCursor(nextCursor);
    setLocal(null);
    setNearCount(serverNearCount);
  }

  // 마우스에는 가로로 굴릴 바퀴가 없어 반응 많은 글 줄은 끌어서도 넘기게 함
  const dragHot = useDragScroll<HTMLDivElement>();

  const category = params.get("category");
  const { areaName: found, ensure, retry, loading: locating, blocked } = useNeighborhood();

  // 서버가 쓴 동네를 먼저 믿음. 위치를 다시 잡기 전에도 글자가 비어 있지 않음
  const areaName = found ?? serverArea;

  // 배너의 값이 바뀔 수 있는 구간 전체. 측위와 행정동 조회에 목록 재조회까지 이어 붙임
  // 측위가 끝나는 순간 표시를 끄면 목록이 갈리는 동안 옛 동네 이름이 맞는 값처럼 남음
  const updating = locating || reloading;

  // 커뮤니티를 열면 동네를 물음. 권한 팝업은 Provider 가 한 번만 띄움
  useEffect(() => {
    ensure();
  }, [ensure]);

  // 조건을 URL 에 담아 상세에서 뒤로 왔을 때 그대로 복원됨
  const setCategory = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (next.get("category") === value) next.delete("category");
    else next.set("category", value);
    // 쌓아 둔 것은 서버가 새 쪽을 보내는 순간 위에서 한 번에 비움
    startTransition(() => {
      router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  };

  // 동네가 잡히면 내 동네 글이 먼저 오도록 첫 쪽을 다시 읽음
  // 응답이 늦게 와도 지금 조건의 것만 반영하도록 요청을 세어 뒤진 응답을 버림
  const reloadId = useRef(0);
  useEffect(() => {
    if (!found) return;
    // 서버가 이미 이 동네로 그렸으면 같은 목록을 다시 받을 이유가 없음
    if (found === serverArea) return;
    const id = (reloadId.current += 1);

    const query = new URLSearchParams();
    if (category) query.set("category", category);
    query.set("areaName", found);

    void (async () => {
      setReloading(true);
      try {
        const response = await fetch(`/api/community?${query}`);
        if (!response.ok) throw new Error("list");
        const data = (await response.json()) as FeedResponse;
        if (reloadId.current !== id) return;
        setLocal(toItems(data.items));
        setNearCount(data.nearCount ?? data.items.length);
        setExtra([]);
        setCursor(data.nextCursor);
        setLoadError(null);
      } catch {
        // 동네로 읽지 못해도 서버가 그린 전국 목록이 남아 있어 조용히 둠
        if (reloadId.current === id) setLocal(null);
      } finally {
        // 뒤진 응답은 표시도 끄지 않음. 더 최근 요청이 아직 돌고 있음
        if (reloadId.current === id) setReloading(false);
      }
    })();
  }, [found, serverArea, category]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const query = new URLSearchParams(params.toString());
      query.set("cursor", cursor);
      if (areaName) query.set("areaName", areaName);
      const response = await fetch(`/api/community?${query}`);
      if (!response.ok) throw new Error("list");
      const data = (await response.json()) as FeedResponse;
      const rows = toItems(data.items);
      // 이어 읽은 쪽에도 내 동네 글이 남아 있으면 구분선 자리를 그만큼 뒤로 미룸
      if (data.nearCount !== undefined) {
        setNearCount((current) => current + data.nearCount!);
      }
      setExtra((current) => [...current, ...rows]);
      setCursor(data.nextCursor);
    } catch {
      // 자동으로 다시 부르지 않고 사용자가 누를 때만 재시도함
      setLoadError("더 불러오지 못했어요. 다시 눌러 주세요");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, params, areaName]);

  // 끝에 닿기 전에 다음 쪽을 미리 불러 둠. 실패한 뒤에는 손으로 누를 때만 다시 부름
  const sentinel = useInfiniteScroll({
    hasMore: Boolean(cursor) && !loadError,
    loading: loadingMore,
    onLoad: loadMore,
  });

  // 동네로 읽었으면 그 목록이 첫 쪽을 대신함
  const rows = [...(local ?? items), ...extra];
  // 동네를 알면 두 제목을 늘 세움. 주제를 눌러 좁혀도 어느 동네 글인지 계속 보임
  const grouped = Boolean(areaName) && rows.length > 0;
  // 내 동네 글이 끝나는 자리. 한 건도 없으면 첫 줄부터 다른 동네라 0
  const dividerAt = grouped && rows.length > nearCount ? nearCount : -1;
  const hot = pickHot(rows);

  return (
    // 떠 있는 버튼이 화면 밖이 아니라 이 프레임 기준으로 붙게 함
    <Screen position="relative">
      <AppHeader
        title="커뮤니티"
        action={
          <ActionButton
            variant="ghost"
            size="medium"
            layout="iconOnly"
            aria-label="내 동네 다시 잡기"
            loading={locating}
            onClick={retry}
          >
            <Icon svg={<IconLocationpinLine />} />
          </ActionButton>
        }
      />
      {/* 설명 줄과 건수를 두지 않음. 목록을 보면 아는 것을 글로 다시 적지 않음 */}
      {/* 주제 줄과 목록은 한 덩어리라 사이를 좁히고 아래 블록과만 벌림 */}
      <ScreenBody gap="x4" pt="x3">
        {/* 어느 동네를 기준으로 목록을 그렸는지 한 줄로 알림
            켜지 않은 사람에게는 켜면 무엇이 달라지는지 같은 자리에서 말함 */}
        <HStack
          gap="x2"
          align="center"
          px="x3"
          py="x2_5"
          borderRadius="r2"
          bg="bg.neutralWeak"
        >
          <Icon svg={<IconLocationpinLine />} size="x4" color="fg.neutralMuted" />
          {updating ? (
            // 바뀔 값만 뼈대로 덮음. 줄을 통째로 비우면 목록까지 갈아엎는 것처럼 보임
            // 읽을 글자가 없는 동안 무엇을 기다리는지는 이 줄이 대신 알림
            <HStack
              gap="x1_5"
              align="center"
              grow={1}
              minWidth="0"
              role="status"
              aria-label="내 동네를 다시 확인하고 있어요"
            >
              <Skeleton width={AREA_SKELETON_WIDTH} />
              <Skeleton width={NOTE_SKELETON_WIDTH} />
            </HStack>
          ) : areaName ? (
            <HStack gap="x1" align="center" grow={1} minWidth="0">
              <Text textStyle="t3Bold" color="fg.neutral" maxLines={1}>
                {areaName}
              </Text>
              <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={1}>
                이웃 글을 먼저 보여 줘요
              </Text>
            </HStack>
          ) : (
            <HStack grow={1} minWidth="0">
              <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={1}>
                위치를 켜면 우리 동네 글부터 보여요
              </Text>
            </HStack>
          )}
          {blocked ? (
            <ActionButton variant="ghost" size="xsmall" onClick={retry}>
              다시 시도
            </ActionButton>
          ) : null}
        </HStack>

        {/* 주제가 늘면 줄바꿈 대신 옆으로 밀림, 목록이 아래로 내려가지 않음
            본문 좌우 여백을 상쇄해 칩이 화면 양 끝에 붙음
            globalGutter 와 x4 는 같은 값이라 어긋나지 않음 */}
        <Box className="rebirth-scroll-row" mx="-x4">
          <HStack gap="spacingX.betweenChips">
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
        </Box>

        {hot.length > 0 ? (
          <Section gap="x3">
            <HStack gap="x1_5" align="center">
              <Icon svg={<IconFireworkLine />} size="x4" color="fg.brand" />
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                반응이 많은 글
              </Text>
            </HStack>
            {/* 가로로 넘기는 줄은 첫 장이 화면 끝에서 시작해야 더 있다는 것이 보임
                넘기는 자리를 HStack 이 직접 맡음. 블록 상자로 감싸면 끝쪽 안쪽 여백이
                스크롤 영역에서 빠져 마지막 장이 화면 끝에 붙음 */}
            <HStack
              className="rebirth-scroll-row rebirth-bleed rebirth-drag-scroll"
              gap="x3"
              align="stretch"
              {...dragHot}
            >
              {hot.map((item) => (
                <HotCard key={item.id} item={item} />
              ))}
            </HStack>
          </Section>
        ) : null}

        {/* 동네 글이 먼저 온다는 것을 목록 위에서 한 줄로 알림
            구분선만 두면 왜 이 글이 위에 있는지 알 수 없음
            내 동네 글이 한 건도 없으면 이 제목 아래가 비어 다른 동네 제목만 세움 */}
        {grouped && nearCount > 0 ? (
          <Text textStyle="t4Bold" color="fg.neutral">
            {areaName} 이야기
          </Text>
        ) : null}

        {rows.length === 0 ? (
          <ResultSection
            size="medium"
            title="아직 글이 없어요"
            description="첫 이야기를 남겨 보세요"
            primaryActionProps={{
              children: "글쓰기",
              onClick: () => setComposeOpen(true),
            }}
          />
        ) : (
          // 주제를 바꾸는 동안 문구 대신 목록을 흐려 전환 중임을 보여 줌
          <VStack
            align="stretch"
            gap="x2"
            style={{
              opacity: pending ? 0.4 : 1,
              transition: "opacity 120ms ease",
            }}
          >
            {rows.map((item, index) => (
              <Fragment key={item.id}>
                {/* 내 동네가 끝나는 자리. 아래부터는 다른 동네 글이라는 것을 알림
                    첫 줄부터 다른 동네면 위에 띄울 내 동네 글이 없어 여백을 주지 않음 */}
                {index === dividerAt ? (
                  <Box pt={index === 0 ? undefined : "x3"}>
                    <Text textStyle="t4Bold" color="fg.neutralMuted">
                      다른 동네 이야기
                    </Text>
                  </Box>
                ) : null}
                <PostCard item={item} />
              </Fragment>
            ))}
          </VStack>
        )}

        {/* 실패했을 때만 손으로 다시 부름. 자동으로 되풀이하면 같은 오류를 계속 부름 */}
        {loadError ? (
          <VStack align="stretch" gap="x3">
            <Callout tone="critical" description={loadError} />
            <ActionButton
              variant="neutralOutline"
              size="large"
              loading={loadingMore}
              onClick={loadMore}
            >
              다시 시도
            </ActionButton>
          </VStack>
        ) : null}

        {/* 목록 끝에 닿기 전에 다음 쪽을 미리 부르는 표식
            보이지 않지만 자리를 차지해야 관찰자가 걸림 */}
        {cursor && !loadError ? <Box ref={sentinel} height="x1" /> : null}

        {/* 불러오는 동안만 표시를 둠. 미리 불러 두면 대개 보이지 않고 지나감 */}
        {loadingMore && !loadError ? (
          <HStack justify="center" py="x4">
            <ProgressCircle size="24" tone="neutral" />
          </HStack>
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
        zIndex={2}
        className="rebirth-above-tabs"
      >
        <FloatingActionButton
          icon={<IconPencilLine />}
          label="글쓰기"
          onClick={() => setComposeOpen(true)}
        />
      </HStack>

      <ComposeSheet open={composeOpen} onOpenChange={setComposeOpen} />
    </Screen>
  );
}
