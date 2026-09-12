import 'server-only'

import { and, asc, desc, eq, inArray, isNull, sql as raw } from 'drizzle-orm'

import type { CommunityCategory } from '@rebirth/types'

import { db } from '../client'
import {
  communityComments,
  communityPostLikes,
  communityPostPhotos,
  communityPosts,
  userProfiles,
} from '../schema'

// 커뮤니티 글 조회와 기록
// 작성자 표시는 user_profiles 를 조인해 가져옴. 계정이 지워져도 글은 남아야 하므로 left join

/** 살아 있고 가려지지 않은 글만 */
const visible = and(
  eq(communityPosts.hidden, false),
  isNull(communityPosts.deletedAt),
)

// 목록 카드가 쓰는 컬럼. body 전문은 목록에 필요 없지만 미리보기를 만들려면 있어야 함
// 잘라 내는 일은 화면이 맡고 여기서는 원문을 줌
const feedColumns = {
  id: communityPosts.id,
  category: communityPosts.category,
  title: communityPosts.title,
  body: communityPosts.body,
  areaName: communityPosts.areaName,
  commentCount: communityPosts.commentCount,
  likeCount: communityPosts.likeCount,
  reportId: communityPosts.reportId,
  createdAt: communityPosts.createdAt,
  authorId: communityPosts.authorId,
  authorName: userProfiles.displayName,
  authorAvatarUrl: userProfiles.avatarUrl,
} as const

export type CommunityFeedRow = {
  [K in keyof typeof feedColumns]: K extends 'authorName' | 'authorAvatarUrl'
    ? string | null
    : (typeof communityPosts.$inferSelect)[Exclude<
        K,
        'authorName' | 'authorAvatarUrl'
      >]
}

/**
 * 최신순 커서. 작성 시각이 같은 행이 섞여도 같은 카드가 두 번 나오지 않게
 * id 까지 함께 비교함. 제보 목록과 같은 규약
 */
export type CommunityCursor = { createdAt: Date; id: string }

export const COMMUNITY_PAGE_SIZE = 20

export type CommunityFeedOptions = {
  category?: CommunityCategory
  authorId?: string
  cursor?: CommunityCursor
  limit?: number
}

/** 커뮤니티 피드 */
export function listCommunityPosts({
  category,
  authorId,
  cursor,
  limit = COMMUNITY_PAGE_SIZE,
}: CommunityFeedOptions = {}) {
  return db
    .select(feedColumns)
    .from(communityPosts)
    .leftJoin(userProfiles, eq(userProfiles.id, communityPosts.authorId))
    .where(
      and(
        visible,
        category ? eq(communityPosts.category, category) : undefined,
        authorId ? eq(communityPosts.authorId, authorId) : undefined,
        cursor
          ? raw`(${communityPosts.createdAt}, ${communityPosts.id}) < (${cursor.createdAt}, ${cursor.id})`
          : undefined,
      ),
    )
    .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
    .limit(limit)
}

/** 상세 한 건. 없거나 가려졌으면 undefined */
export async function findCommunityPost(id: string) {
  const [row] = await db
    .select(feedColumns)
    .from(communityPosts)
    .leftJoin(userProfiles, eq(userProfiles.id, communityPosts.authorId))
    .where(and(eq(communityPosts.id, id), visible))
    .limit(1)
  return row
}

/** 글에 붙은 사진 경로. 서명 URL 발급에만 씀 */
export function findCommunityPhotoPaths(postId: string) {
  return db
    .select({ storagePath: communityPostPhotos.storagePath })
    .from(communityPostPhotos)
    .where(eq(communityPostPhotos.postId, postId))
    .orderBy(communityPostPhotos.sortOrder)
}

/**
 * 여러 글의 사진 경로를 한 번에 읽음
 * 피드가 글마다 따로 물으면 카드 수만큼 질의가 나감
 */
export function findCommunityPhotoPathsForPosts(postIds: string[]) {
  if (postIds.length === 0) return Promise.resolve([])
  return db
    .select({
      postId: communityPostPhotos.postId,
      storagePath: communityPostPhotos.storagePath,
    })
    .from(communityPostPhotos)
    .where(inArray(communityPostPhotos.postId, postIds))
    .orderBy(asc(communityPostPhotos.postId), asc(communityPostPhotos.sortOrder))
}

export type NewCommunityPostInput = {
  authorId: string
  category: CommunityCategory
  title: string
  body: string
  areaName?: string | null
  reportId?: string | null
  photoPaths?: string[]
}

/**
 * 글과 사진을 한 트랜잭션으로 저장
 * 사진만 남고 글이 없거나 그 반대가 되면 어느 쪽도 고칠 수 없음
 */
export async function insertCommunityPost(
  input: NewCommunityPostInput,
): Promise<string> {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .insert(communityPosts)
      .values({
        authorId: input.authorId,
        category: input.category,
        title: input.title,
        body: input.body,
        areaName: input.areaName ?? null,
        reportId: input.reportId ?? null,
      })
      .returning({ id: communityPosts.id })

    if (!post) throw new Error('community_posts insert 가 행을 돌려주지 않았습니다')

    const paths = input.photoPaths ?? []
    if (paths.length > 0) {
      await tx.insert(communityPostPhotos).values(
        paths.map((storagePath, sortOrder) => ({
          postId: post.id,
          storagePath,
          sortOrder,
        })),
      )
    }

    return post.id
  })
}

/** 작성자 본인만 지울 수 있음. 행을 지우지 않아야 달린 댓글 맥락이 남음 */
export async function softDeleteCommunityPost(
  id: string,
  authorId: string,
): Promise<boolean> {
  const rows = await db
    .update(communityPosts)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(communityPosts.id, id),
        eq(communityPosts.authorId, authorId),
        isNull(communityPosts.deletedAt),
      ),
    )
    .returning({ id: communityPosts.id })
  return rows.length > 0
}

const commentColumns = {
  id: communityComments.id,
  body: communityComments.body,
  createdAt: communityComments.createdAt,
  authorId: communityComments.authorId,
  authorName: userProfiles.displayName,
  authorAvatarUrl: userProfiles.avatarUrl,
} as const

export type CommunityCommentRow = {
  id: string
  body: string
  createdAt: Date
  authorId: string
  authorName: string | null
  authorAvatarUrl: string | null
}

/** 한 글의 댓글. 오래된 순서가 대화 흐름에 맞음 */
export function listCommunityComments(postId: string) {
  return db
    .select(commentColumns)
    .from(communityComments)
    .leftJoin(userProfiles, eq(userProfiles.id, communityComments.authorId))
    .where(
      and(
        eq(communityComments.postId, postId),
        isNull(communityComments.deletedAt),
      ),
    )
    .orderBy(communityComments.createdAt)
}

/**
 * 댓글을 달고 글의 집계를 함께 올림
 * 두 문장이 갈라지면 목록의 댓글 수가 실제와 어긋남
 */
export async function insertCommunityComment(input: {
  postId: string
  authorId: string
  body: string
}): Promise<CommunityCommentRow | undefined> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(communityComments)
      .values(input)
      .returning({ id: communityComments.id })
    if (!row) return undefined

    await tx
      .update(communityPosts)
      .set({ commentCount: raw`${communityPosts.commentCount} + 1` })
      .where(eq(communityPosts.id, input.postId))

    const [full] = await tx
      .select(commentColumns)
      .from(communityComments)
      .leftJoin(userProfiles, eq(userProfiles.id, communityComments.authorId))
      .where(eq(communityComments.id, row.id))
      .limit(1)
    return full
  })
}

/** 작성자 본인만 지울 수 있음 */
export async function softDeleteCommunityComment(
  id: string,
  authorId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(communityComments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(communityComments.id, id),
          eq(communityComments.authorId, authorId),
          isNull(communityComments.deletedAt),
        ),
      )
      .returning({ postId: communityComments.postId })
    if (!row) return false

    // 0 아래로 내려가지 않게 함. 집계가 음수면 화면이 이상해짐
    await tx
      .update(communityPosts)
      .set({
        commentCount: raw`greatest(${communityPosts.commentCount} - 1, 0)`,
      })
      .where(eq(communityPosts.id, row.postId))
    return true
  })
}

/** 내가 이 글에 공감했는지 */
export async function hasCommunityLike(
  postId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ postId: communityPostLikes.postId })
    .from(communityPostLikes)
    .where(
      and(
        eq(communityPostLikes.postId, postId),
        eq(communityPostLikes.userId, userId),
      ),
    )
    .limit(1)
  return row !== undefined
}

/**
 * 공감을 켜고 끔. 누른 뒤 상태와 집계를 함께 돌려줌
 * 이미 눌렀는지 먼저 읽고 분기하면 두 번 누를 때 경합이 생기므로
 * insert 의 충돌 여부로 판정함
 */
export async function toggleCommunityLike(
  postId: string,
  userId: string,
): Promise<{ liked: boolean; count: number }> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(communityPostLikes)
      .values({ postId, userId })
      .onConflictDoNothing()
      .returning({ postId: communityPostLikes.postId })

    const liked = inserted.length > 0
    if (!liked) {
      await tx
        .delete(communityPostLikes)
        .where(
          and(
            eq(communityPostLikes.postId, postId),
            eq(communityPostLikes.userId, userId),
          ),
        )
    }

    const [row] = await tx
      .update(communityPosts)
      .set({
        likeCount: liked
          ? raw`${communityPosts.likeCount} + 1`
          : raw`greatest(${communityPosts.likeCount} - 1, 0)`,
      })
      .where(eq(communityPosts.id, postId))
      .returning({ likeCount: communityPosts.likeCount })

    return { liked, count: row?.likeCount ?? 0 }
  })
}
