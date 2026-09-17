import "server-only";

import { createSignedThumbUrls } from "@rebirth/core/storage";
import {
  findCommunityPhotoPathsForPosts,
  type CommunityFeedRow,
} from "@rebirth/db";

import type { PostCardItem } from "@/components/community/post-card";

// 피드 행을 카드로 옮김
// 페이지와 더보기 API 가 같은 함수를 써야 이어 읽은 카드가 다르게 보이지 않음

/** 카드에 쓰는 대표 사진 한 장씩 골라 서명 URL 로 바꿈 */
async function firstPhotoUrls(postIds: string[]): Promise<Map<string, string>> {
  if (postIds.length === 0) return new Map();

  let rows: { postId: string; storagePath: string }[] = [];
  try {
    rows = await findCommunityPhotoPathsForPosts(postIds);
  } catch {
    // 사진을 못 읽어도 글은 보여야 함
    return new Map();
  }

  // 글마다 첫 장만 남김. 정렬이 sortOrder 오름차순이라 먼저 온 것이 대표
  const firstPath = new Map<string, string>();
  for (const row of rows) {
    if (!firstPath.has(row.postId)) firstPath.set(row.postId, row.storagePath);
  }

  const signed = await createSignedThumbUrls([...firstPath.values()]);

  const byPost = new Map<string, string>();
  for (const [postId, path] of firstPath) {
    const url = signed.get(path);
    if (url) byPost.set(postId, url);
  }
  return byPost;
}

export async function toFeedItems(
  rows: CommunityFeedRow[],
): Promise<PostCardItem[]> {
  const photos = await firstPhotoUrls(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    areaName: row.areaName,
    commentCount: row.commentCount,
    likeCount: row.likeCount,
    createdAt: row.createdAt,
    authorName: row.authorName,
    photoUrl: photos.get(row.id) ?? null,
  }));
}
