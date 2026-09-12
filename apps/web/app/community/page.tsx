import type { Metadata } from "next";
import { cookies } from "next/headers";

import { findCategory } from "@rebirth/core/community";
import { AREA_COOKIE, readAreaCookie } from "@rebirth/core/location";

import { CommunityFeed } from "@/components/community/community-feed";
import type { PostCardItem } from "@/components/community/post-card";
import { toFeedItems } from "./feed-item";
import { encodeFeedCursor, readFeedPage } from "./feed-page";

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

  // 지난번에 알아낸 동네. 있으면 처음부터 내 동네 글이 먼저 그려져 목록이 한 번 바뀌지 않음
  const areaName = readAreaCookie((await cookies()).get(AREA_COOKIE)?.value);

  const page = await readFeedPage({ category, areaName });
  const items: PostCardItem[] = await toFeedItems(page.rows);

  return (
    <CommunityFeed
      items={items}
      nextCursor={encodeFeedCursor(page.nextCursor)}
      areaName={areaName ?? null}
      nearCount={page.nearCount}
    />
  );
}

/** 같은 이름이 여러 번 오면 배열이라 첫 값만 씀 */
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
