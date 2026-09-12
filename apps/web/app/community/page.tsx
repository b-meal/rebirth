import type { Metadata } from "next";

import { findCategory } from "@rebirth/core/community";
import { COMMUNITY_PAGE_SIZE, listCommunityPosts } from "@rebirth/db";

import { CommunityFeed } from "@/components/community/community-feed";
import type { PostCardItem } from "@/components/community/post-card";
import { toFeedItems } from "./feed-item";

// 이웃끼리 이야기를 나누는 자리. 읽기는 로그인 없이 열고 쓰기만 계정을 요구함

export const metadata: Metadata = {
  title: "커뮤니티",
  description: "이웃과 발견동물 이야기를 나누는 자리입니다",
};

// 새 글과 댓글이 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

export default async function CommunityPage({
  searchParams,
}: PageProps<"/community">) {
  const params = await searchParams;
  const category = findCategory(readParam(params.category))?.id;

  // 한 건 더 읽어 다음 쪽이 있는지 판단함. 제보 목록과 같은 규약
  const rows = await listCommunityPosts({
    category,
    limit: COMMUNITY_PAGE_SIZE + 1,
  });

  const hasMore = rows.length > COMMUNITY_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, COMMUNITY_PAGE_SIZE) : rows;
  const last = page.at(-1);

  const items: PostCardItem[] = await toFeedItems(page);
  const nextCursor =
    hasMore && last ? `${last.createdAt.toISOString()}_${last.id}` : null;

  return <CommunityFeed items={items} nextCursor={nextCursor} />;
}

/** 같은 이름이 여러 번 오면 배열이라 첫 값만 씀 */
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
