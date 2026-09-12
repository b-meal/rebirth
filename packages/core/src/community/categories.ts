import type { CommunityCategory } from '@rebirth/types'

// 커뮤니티 주제 목록의 단일 원천
// 화면이 주제를 하드코딩하면 주제를 늘릴 때마다 탭과 글쓰기 폼을 따로 고쳐야 함

export type CategoryDescriptor = {
  id: CommunityCategory
  /** 탭과 배지에 쓰는 짧은 이름 */
  label: string
  /** 글쓰기에서 무엇을 쓰는 자리인지 알려 주는 한 줄 */
  hint: string
}

export const COMMUNITY_CATEGORIES: readonly CategoryDescriptor[] = [
  {
    id: 'sighting_talk',
    label: '목격',
    hint: '확실하진 않지만 본 것 같은 이야기',
  },
  {
    id: 'reunion',
    label: '재회',
    hint: '다시 만난 이야기',
  },
  {
    id: 'care_tip',
    label: '돌봄',
    hint: '임시보호와 구조에서 얻은 정보',
  },
  {
    id: 'neighborhood',
    label: '동네',
    hint: '이웃과 나누고 싶은 이야기',
  },
] as const

const BY_ID = new Map(COMMUNITY_CATEGORIES.map((c) => [c.id as string, c]))

/** 주소나 폼에서 온 값을 주제로 바꿈. 모르는 값이면 undefined */
export function findCategory(
  value: string | undefined | null,
): CategoryDescriptor | undefined {
  if (!value) return undefined
  return BY_ID.get(value)
}

/** 배지에 쓰는 이름. 주제를 모르면 빈 문자열이 아니라 기본 주제 이름을 씀 */
export function categoryLabel(value: CommunityCategory): string {
  return BY_ID.get(value)?.label ?? '동네'
}
