import { pgEnum } from 'drizzle-orm/pg-core'

// 실종은 보호자가 찾는 글, 목격은 발견 제보, 보호는 임시보호 중 알림
export const reportKind = pgEnum('report_kind', ['sighting', 'lost', 'sheltered'])

// open 은 공개 중, matched 는 후보 연결됨, resolved 는 재회·입양 완료
export const reportStatus = pgEnum('report_status', [
  'draft',
  'open',
  'matched',
  'resolved',
  'hidden',
])

export const animalType = pgEnum('animal_type', ['dog', 'cat', 'other', 'unknown'])

export const animalSize = pgEnum('animal_size', [
  'small',
  'medium',
  'large',
  'unknown',
])

export const animalSex = pgEnum('animal_sex', ['male', 'female', 'unknown'])

export const neuterStatus = pgEnum('neuter_status', ['done', 'not_done', 'unknown'])
