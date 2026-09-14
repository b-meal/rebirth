import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core'

import { reports } from './reports'

// 외형 설명의 의미 벡터. 배점이 못 보는 표현 차이를 잡는 자리
// 흰색 소형견 털이 길고 엉킴 과 장모 백색 소형견 털 엉킴 상태 는 배점이 같게 보지 못함

/** 다국어 MiniLM 이 내는 차원. 모델을 바꾸면 열을 새로 만들어야 함 */
export const EMBEDDING_DIMENSIONS = 384

export const reportEmbeddings = pgTable(
  'report_embeddings',
  {
    reportId: uuid()
      .primaryKey()
      .references(() => reports.id, { onDelete: 'cascade' }),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }).notNull(),

    // 무엇을 넣어 만든 벡터인지. 프롬프트가 바뀌면 다시 만들 대상을 고르는 근거
    sourceText: text().notNull(),
    model: text().notNull(),

    // 384차원을 주성분 둘로 눌러 담은 좌표. 화면에 흩뿌려 보는 용도로만 씀
    // 거리 판단에는 쓰지 않음. 눌러 담는 과정에서 원래 거리가 보존되지 않음
    projX: doublePrecision(),
    projY: doublePrecision(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 코사인 거리로만 조회함. 정규화된 벡터라 내적과 순서가 같음
    index('report_embeddings_cos_idx').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops'),
    ),
  ],
)

export type ReportEmbedding = typeof reportEmbeddings.$inferSelect
