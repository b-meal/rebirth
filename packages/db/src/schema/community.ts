import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

import { communityCategory } from './enums'
import { userProfiles } from './accounts'
import { reports } from './reports'

// 이웃끼리 나누는 글. 제보로 올리기엔 확실하지 않은 목격담과 재회 후기가 여기로 옴
// 제보(reports)와 나누는 이유는 수명과 책임이 달라서임
// 제보는 관리 토큰으로 익명 수정되고 매칭 점수에 들어가지만 커뮤니티 글은 계정에 묶임

export const communityPosts = pgTable(
  'community_posts',
  {
    id: uuid().defaultRandom().primaryKey(),
    // 글쓰기는 로그인을 요구하므로 작성자가 반드시 있음
    // FK 를 걸지 않는 이유는 accounts 와 같음. auth 스키마 소유권이 Supabase 에 있음
    authorId: uuid().notNull(),
    category: communityCategory().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    // 글이 가리키는 제보. 목격담이 제보로 이어지면 연결해 함께 보여 줌
    reportId: uuid().references(() => reports.id, { onDelete: 'set null' }),
    // 동 이름만 둠. 정확 좌표는 넣지 않음
    areaName: text(),
    // 집계를 매번 세지 않으려고 들고 있음. 진실은 각 테이블이고 이 값은 표시용
    commentCount: integer().notNull().default(0),
    likeCount: integer().notNull().default(0),
    // 신고 처리로 내려간 글. 지우지 않아야 댓글 맥락이 남음
    hidden: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    // 피드 기본 질의. 숨김과 삭제를 걸러 최신순으로 읽음
    index('community_posts_feed_idx').on(
      t.hidden,
      t.deletedAt,
      t.createdAt.desc(),
    ),
    // 주제 탭이 붙는 질의
    index('community_posts_category_idx').on(t.category, t.createdAt.desc()),
    // 마이페이지의 내가 쓴 글
    index('community_posts_author_idx').on(t.authorId, t.createdAt.desc()),
    // 내 동네 피드. 동으로 좁힌 뒤 최신순으로 읽음
    index('community_posts_area_idx').on(t.areaName, t.createdAt.desc()),
  ],
)

// 글에 붙는 사진. report_photos 와 같은 이유로 행을 나눠 순서를 들고 있음
export const communityPostPhotos = pgTable(
  'community_post_photos',
  {
    id: uuid().defaultRandom().primaryKey(),
    postId: uuid()
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    // 비공개 버킷의 객체 경로. 공개 URL 이 아니라 서명해서 내보냄
    storagePath: text().notNull(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('community_post_photos_post_idx').on(t.postId, t.sortOrder)],
)

// 글에 달리는 댓글. 제보 댓글과 달리 로그인 계정이 작성자라 익명 번호를 쓰지 않음
export const communityComments = pgTable(
  'community_comments',
  {
    id: uuid().defaultRandom().primaryKey(),
    postId: uuid()
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    authorId: uuid().notNull(),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index('community_comments_thread_idx').on(t.postId, t.createdAt),
    index('community_comments_author_idx').on(t.authorId),
  ],
)

// 공감. 계정당 한 번만 남고 취소하면 지움
export const communityPostLikes = pgTable(
  'community_post_likes',
  {
    postId: uuid()
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    userId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.userId] }),
    index('community_post_likes_user_idx').on(t.userId),
  ],
)

export const communityPostsRelations = relations(
  communityPosts,
  ({ one, many }) => ({
    author: one(userProfiles, {
      fields: [communityPosts.authorId],
      references: [userProfiles.id],
    }),
    report: one(reports, {
      fields: [communityPosts.reportId],
      references: [reports.id],
    }),
    photos: many(communityPostPhotos),
    comments: many(communityComments),
    likes: many(communityPostLikes),
  }),
)

export const communityPostPhotosRelations = relations(
  communityPostPhotos,
  ({ one }) => ({
    post: one(communityPosts, {
      fields: [communityPostPhotos.postId],
      references: [communityPosts.id],
    }),
  }),
)

export const communityCommentsRelations = relations(
  communityComments,
  ({ one }) => ({
    post: one(communityPosts, {
      fields: [communityComments.postId],
      references: [communityPosts.id],
    }),
    author: one(userProfiles, {
      fields: [communityComments.authorId],
      references: [userProfiles.id],
    }),
  }),
)

export const communityPostLikesRelations = relations(
  communityPostLikes,
  ({ one }) => ({
    post: one(communityPosts, {
      fields: [communityPostLikes.postId],
      references: [communityPosts.id],
    }),
  }),
)

export type CommunityPost = typeof communityPosts.$inferSelect
export type NewCommunityPost = typeof communityPosts.$inferInsert
export type CommunityPostPhoto = typeof communityPostPhotos.$inferSelect
export type CommunityComment = typeof communityComments.$inferSelect
export type NewCommunityComment = typeof communityComments.$inferInsert
