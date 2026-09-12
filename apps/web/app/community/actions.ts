"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  communityCommentInput,
  communityPostInput,
  fieldErrors,
} from "@rebirth/core/community";
import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";
import {
  findUsableUploads,
  insertCommunityComment,
  insertCommunityPost,
  softDeleteCommunityComment,
  softDeleteCommunityPost,
  toggleCommunityLike,
} from "@rebirth/db";
import { findDraftSession } from "@rebirth/core/http";
import { headers } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";

// 커뮤니티 쓰기 동작
// Server Action 은 화면을 거치지 않고 직접 POST 로도 불리므로
// 모든 함수가 첫 줄에서 로그인을 확인하고 남의 글은 건드리지 못하게 작성자를 함께 비교함

const FEED_PATH = "/community";

/** 로그인한 사용자 id. 없으면 로그인 화면으로 보냄 */
async function requireUserId(next: string): Promise<string> {
  const user = await getCurrentUser();
  if (user) return user.id;
  redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(next)}`);
}

export type PostFormState = {
  /** 필드별 첫 오류. 비어 있으면 통과 */
  errors?: Record<string, string>;
  /** 저장 자체가 실패했을 때만 채움 */
  message?: string;
};

/** 서버 액션은 Request 를 받지 않아 쿠키를 헤더에서 되살려 초안 세션을 찾음 */
async function draftSessionId(): Promise<string | undefined> {
  const cookie = (await headers()).get("cookie") ?? "";
  return findDraftSession(new Request("http://local", { headers: { cookie } }));
}

/**
 * 올려 둔 사진 참조를 저장 경로로 바꿈
 * 질의는 제 순서로 돌려주므로 고른 차례대로 다시 세움. 첫 장이 카드의 대표 사진이 됨
 * 남의 세션 것이나 이미 쓴 참조는 질의에서 빠져 조용히 사라짐
 */
async function resolveUploadPaths(uploadIds: string[]): Promise<string[]> {
  if (uploadIds.length === 0) return [];

  const sessionId = await draftSessionId();
  if (!sessionId) return [];

  const rows = await findUsableUploads({ sessionId, ids: uploadIds });
  const byId = new Map(rows.map((row) => [row.id, row.storagePath]));
  return uploadIds.flatMap((id) => {
    const path = byId.get(id);
    return path ? [path] : [];
  });
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  // 글쓰기는 시트라 돌아갈 주소가 없음. 목록으로 보내고 거기서 다시 열게 함
  const authorId = await requireUserId(FEED_PATH);

  const parsed = communityPostInput.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
    areaName: formData.get("areaName") ?? undefined,
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // 사진은 제보와 같은 초안 업로드를 거쳐 오고 경로만 옮겨 붙임
  // 고른 순서를 지켜야 첫 장이 목록 카드의 대표 사진이 됨
  const photoPaths = await resolveUploadPaths(formData.getAll("uploadIds").map(String));

  let id: string;
  try {
    id = await insertCommunityPost({ authorId, ...parsed.data, photoPaths });
  } catch {
    // 원인을 그대로 내보내지 않음. 화면에 DB 오류가 새면 안 됨
    return { message: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오" };
  }

  revalidatePath(FEED_PATH);
  redirect(`${FEED_PATH}/${id}`);
}

export type CommentFormState = { message?: string };

export async function createComment(
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const postId = formData.get("postId")?.toString();
  if (!postId) return { message: "글을 찾지 못했습니다" };

  const authorId = await requireUserId(`${FEED_PATH}/${postId}`);

  const parsed = communityCommentInput.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { message: fieldErrors(parsed.error).body ?? "댓글을 입력해 주십시오" };
  }

  try {
    await insertCommunityComment({ postId, authorId, body: parsed.data.body });
  } catch {
    return { message: "댓글을 남기지 못했습니다. 잠시 후 다시 시도해 주십시오" };
  }

  revalidatePath(`${FEED_PATH}/${postId}`);
  return {};
}

/** 공감 켜고 끄기. 화면이 눌린 결과를 바로 그리도록 상태를 돌려줌 */
export async function toggleLike(postId: string) {
  const userId = await requireUserId(`${FEED_PATH}/${postId}`);
  const result = await toggleCommunityLike(postId, userId);
  revalidatePath(`${FEED_PATH}/${postId}`);
  return result;
}

export async function deletePost(formData: FormData) {
  const postId = formData.get("postId")?.toString();
  if (!postId) return;

  const userId = await requireUserId(`${FEED_PATH}/${postId}`);
  // 작성자 비교는 질의 안에서 함. 여기서 먼저 읽고 판단하면 그 사이에 주인이 바뀔 수 있음
  const removed = await softDeleteCommunityPost(postId, userId);
  if (!removed) return;

  revalidatePath(FEED_PATH);
  redirect(FEED_PATH);
}

export async function deleteComment(formData: FormData) {
  const commentId = formData.get("commentId")?.toString();
  const postId = formData.get("postId")?.toString();
  if (!commentId || !postId) return;

  const userId = await requireUserId(`${FEED_PATH}/${postId}`);
  await softDeleteCommunityComment(commentId, userId);
  revalidatePath(`${FEED_PATH}/${postId}`);
}
