import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createSignedUrls } from "@rebirth/core/storage";
import {
  findCommunityPost,
  findCommunityPhotoPaths,
  hasCommunityLike,
  listCommunityComments,
} from "@rebirth/db";

import { PostDetail } from "@/components/community/post-detail";
import { getCurrentUser } from "@/lib/auth/session";

// 커뮤니티 글 한 편. 읽기는 로그인 없이 열림

type Params = { params: Promise<{ id: string }> };

// 새 댓글과 공감이 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  let post: Awaited<ReturnType<typeof findCommunityPost>>;
  try {
    post = await findCommunityPost(id);
  } catch {
    // 조회 실패 시 기본 메타로 떨어뜨림
    return { title: "커뮤니티", robots: { index: false } };
  }

  if (!post) return { title: "찾는 글이 없습니다", robots: { index: false } };

  return {
    title: post.title,
    description: post.body.replace(/\s+/g, " ").slice(0, 100),
  };
}

export default async function CommunityPostPage({ params }: Params) {
  const { id } = await params;

  const post = await findCommunityPost(id);
  if (!post) notFound();

  const viewer = await getCurrentUser();

  // 사진 서명과 공감 여부는 서로를 기다릴 이유가 없어 함께 부름
  const [paths, comments, liked] = await Promise.all([
    findCommunityPhotoPaths(id),
    listCommunityComments(id),
    viewer ? hasCommunityLike(id, viewer.id) : Promise.resolve(false),
  ]);

  const signed = await createSignedUrls(paths.map((row) => row.storagePath));
  const photoUrls = paths
    .map((row) => signed.get(row.storagePath))
    .filter((url): url is string => Boolean(url));

  return (
    <PostDetail
      post={post}
      photoUrls={photoUrls}
      comments={comments}
      like={{ count: post.likeCount, mine: liked }}
      isAuthor={viewer?.id === post.authorId}
      signedIn={Boolean(viewer)}
    />
  );
}
