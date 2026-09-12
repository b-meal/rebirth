import { z } from 'zod'

import type { CommunityCategory } from '@rebirth/types'

// 글과 댓글의 입력 규칙
// Server Action 은 화면을 거치지 않고 직접 POST 로도 불릴 수 있으므로
// 폼에서 막는 것과 별개로 서버가 같은 규칙을 다시 검사함

// 값을 여기 두는 이유는 core 가 @rebirth/types 를 타입으로만 쓰기 때문임
// 런타임 import 를 넣으면 확장자 없는 상대 경로 탓에 node --test 가 모듈을 못 찾음
// 아래 _sameAsTypes 가 두 목록이 갈라지는 순간 typecheck 를 깨뜨림
const CATEGORY_VALUES = [
  'sighting_talk',
  'reunion',
  'care_tip',
  'neighborhood',
] as const

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
const _sameAsTypes: Same<(typeof CATEGORY_VALUES)[number], CommunityCategory> =
  true
void _sameAsTypes

const communityCategory = z.enum(CATEGORY_VALUES, {
  error: '주제를 골라 주세요',
})

export const TITLE_MAX = 60
export const BODY_MAX = 2000
export const COMMENT_MAX = 500
export const PHOTO_MAX = 5

/** 앞뒤 공백만 있는 입력을 빈 값으로 봄 */
const trimmed = z.string().transform((v) => v.trim())

export const communityPostInput = z.object({
  category: communityCategory,
  title: trimmed.pipe(
    z
      .string()
      .min(2, { error: '제목을 두 글자 이상 써 주세요' })
      .max(TITLE_MAX, { error: `제목은 ${TITLE_MAX}자까지 쓸 수 있어요` }),
  ),
  body: trimmed.pipe(
    z
      .string()
      .min(5, { error: '내용을 다섯 글자 이상 써 주세요' })
      .max(BODY_MAX, { error: `내용은 ${BODY_MAX}자까지 쓸 수 있어요` }),
  ),
  // 동 이름만 받음. 정확 좌표는 커뮤니티 글에 넣지 않음
  areaName: trimmed
    .pipe(z.string().max(40, { error: '동네 이름이 너무 길어요' }))
    .optional()
    .transform((v) => (v ? v : null)),
})

export type CommunityPostInput = z.infer<typeof communityPostInput>

export const communityCommentInput = z.object({
  body: trimmed.pipe(
    z
      .string()
      .min(1, { error: '댓글을 입력해 주세요' })
      .max(COMMENT_MAX, { error: `댓글은 ${COMMENT_MAX}자까지 쓸 수 있어요` }),
  ),
})

/**
 * zod 오류를 필드별 첫 메시지로 줄임
 * 한 필드에 여러 규칙이 걸려도 화면은 한 번에 하나만 보여 주면 됨
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || key in out) continue
    out[key] = issue.message
  }
  return out
}
