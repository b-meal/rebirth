import "server-only";

import { COMMUNITY_PAGE_SIZE, listCommunityPosts } from "@rebirth/db";
import type { CommunityCategory } from "@rebirth/types";

// 피드 한 쪽을 읽는 규칙
// 서버 컴포넌트의 첫 쪽과 더 보기 API 가 같은 함수를 써야 두 길이 어긋나지 않음
// 동네를 알면 내 동네를 먼저 다 보여 주고 남는 자리를 다른 동네로 채움

export type FeedSegment = "near" | "far";

export type FeedCursor = { segment: FeedSegment; createdAt: Date; id: string };

export type FeedPage = {
  rows: Awaited<ReturnType<typeof listCommunityPosts>>;
  nextCursor: { segment: FeedSegment; createdAt: Date; id: string } | null;
  /** 앞에서부터 몇 건이 내 동네 글인지. 화면이 구분선을 놓는 자리 */
  nearCount: number;
};

export type FeedPageOptions = {
  category?: CommunityCategory;
  areaName?: string;
  cursor?: FeedCursor;
};

/** 동네를 모를 때. 예전처럼 전체를 최신순으로 읽음 */
async function readAll({ category, cursor }: FeedPageOptions): Promise<FeedPage> {
  const rows = await listCommunityPosts({
    category,
    cursor,
    limit: COMMUNITY_PAGE_SIZE + 1,
  });
  const hasMore = rows.length > COMMUNITY_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, COMMUNITY_PAGE_SIZE) : rows;
  const last = page.at(-1);
  return {
    rows: page,
    nextCursor: hasMore && last ? { segment: "near", ...last } : null,
    nearCount: 0,
  };
}

export async function readFeedPage(options: FeedPageOptions): Promise<FeedPage> {
  const { category, areaName, cursor } = options;
  if (!areaName) return readAll(options);

  // 나머지 구간으로 이미 넘어왔으면 다른 동네만 이어 읽음
  if (cursor?.segment === "far") {
    const far = await listCommunityPosts({
      category,
      areaName,
      excludeArea: true,
      cursor,
      limit: COMMUNITY_PAGE_SIZE + 1,
    });
    const hasMore = far.length > COMMUNITY_PAGE_SIZE;
    const page = hasMore ? far.slice(0, COMMUNITY_PAGE_SIZE) : far;
    const last = page.at(-1);
    return {
      rows: page,
      nextCursor: hasMore && last ? { segment: "far", ...last } : null,
      nearCount: 0,
    };
  }

  // 내 동네 구간. 한 쪽을 다 채우면 아직 더 있다는 뜻이라 여기서 끊음
  const near = await listCommunityPosts({
    category,
    areaName,
    cursor,
    limit: COMMUNITY_PAGE_SIZE + 1,
  });

  if (near.length > COMMUNITY_PAGE_SIZE) {
    const page = near.slice(0, COMMUNITY_PAGE_SIZE);
    const last = page.at(-1);
    return {
      rows: page,
      nextCursor: last ? { segment: "near", ...last } : null,
      nearCount: page.length,
    };
  }

  // 내 동네가 끝났으므로 남은 자리를 다른 동네 최신순으로 채움
  const remain = COMMUNITY_PAGE_SIZE - near.length;
  const far =
    remain > 0
      ? await listCommunityPosts({
          category,
          areaName,
          excludeArea: true,
          limit: remain + 1,
        })
      : [];

  const farPage = far.slice(0, remain);
  const farLast = farPage.at(-1);
  return {
    rows: [...near, ...farPage],
    nextCursor: far.length > remain && farLast ? { segment: "far", ...farLast } : null,
    nearCount: near.length,
  };
}

/** 커서를 화면과 주고받는 문자열로. 구간이 있어야 이어 읽을 곳을 알 수 있음 */
export function encodeFeedCursor(
  cursor: { segment: FeedSegment; createdAt: Date; id: string } | null,
): string | null {
  return cursor ? `${cursor.segment}:${cursor.createdAt.toISOString()}_${cursor.id}` : null;
}
