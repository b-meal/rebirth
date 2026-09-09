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

// 제보 1단계에서 받는 분기 기준. 4단계 마무리 문구와 상세 상태 밴드가 여기서 갈림
// roaming 은 배회 중, in_care 는 제보자가 데리고 있음
// unknown 은 실종 신고처럼 보호 상황이 성립하지 않는 제보
export const careSituation = pgEnum('care_situation', [
  'roaming',
  'in_care',
  'unknown',
])

// 화면 기획서 S-006 신고 사유 5종. 값은 @rebirth/types 의 REPORT_REASONS 와 같음
export const flagReason = pgEnum('flag_reason', [
  'not-animal',
  'duplicate',
  'wrong-info',
  'privacy',
  'other',
])

// 운영자 판정. hide 는 제보를 hidden 으로, keep 은 신고를 기각
export const flagResolution = pgEnum('flag_resolution', ['hide', 'keep'])
