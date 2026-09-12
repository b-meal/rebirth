import { pgEnum } from 'drizzle-orm/pg-core'

// 실종은 보호자가 찾는 글, 목격은 발견 제보, 보호는 임시보호 중 알림
export const reportKind = pgEnum('report_kind', ['sighting', 'lost', 'sheltered'])

// 공개 여부. POL-06 에 따라 진행 상태와 독립된 축으로 둠
// 운영자는 hidden↔public 만 처리하고 deleted→public 은 금지
export const visibility = pgEnum('visibility', ['public', 'hidden', 'deleted'])

// 진행 상태. 발견은 active|closed, 실종은 searching|resolved|closed
// kind 별 허용값은 reports 테이블의 CHECK 제약이 강제함
export const lifecycle = pgEnum('lifecycle', [
  'active',
  'closed',
  'searching',
  'resolved',
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

// SNS 로그인 제공자. 값은 @rebirth/types 의 authProvider 와 같아야 함
export const authProvider = pgEnum('auth_provider', ['google', 'kakao'])

// 문의·권리 요청 분류. WEB-24
export const supportRequestKind = pgEnum('support_request_kind', [
  'manage_token_lost',
  'deletion',
  'correction',
  'privacy_exposure',
  'general',
])

// 접수 처리 상태
export const supportStatus = pgEnum('support_status', [
  'received',
  'reviewing',
  'need_more_info',
  'answered',
  'closed',
])

// 법적 고지 종류. WEB-22, WEB-23
export const legalDocType = pgEnum('legal_doc_type', [
  'privacy',
  'terms',
  'location',
  'notice',
  'safety_guide',
])

// 발행 상태. POL-38 의 초안 → 검토 → 발행/예약 → 폐기
export const legalDocStatus = pgEnum('legal_doc_status', [
  'draft',
  'reviewing',
  'scheduled',
  'published',
  'retired',
])

// 동의 종류. 필수와 선택을 섞으면 일괄 동의가 되어 POL-38 위반
// required_terms 는 공개 저장의 전제, 나머지는 거부해도 제보가 진행됨
export const consentKind = pgEnum('consent_kind', [
  'required_terms',
  'required_privacy',
  'optional_ai',
  'optional_location',
])

// 업로드 파일 검증 상태. WEB-03
// 저품질·다중동물은 AI 경고라 여기 넣지 않음. 파일 유효성과 내용은 다른 축
export const uploadStatus = pgEnum('upload_status', [
  'processing',
  'ready',
  'failed',
])

// 위치 출처. POL-08. manual_area 는 정확 좌표가 없어 거리 점수를 받지 않음
export const locationSource = pgEnum('location_source', [
  'gps',
  'place',
  'manual_area',
])

// 행정동과 법정동 코드를 섞으면 지역 비교가 어긋남
export const areaCodeSystem = pgEnum('area_code_system', ['H', 'B'])

// 종료·삭제 사유. WEB-17
export const closeReason = pgEnum('close_reason', [
  'found',
  'duplicate',
  'canceled',
  'outdated',
  'other',
])

// WEB-10 신고 사유 7종. 값은 @rebirth/types 의 flagReason 과 같아야 함
export const flagReason = pgEnum('flag_reason', [
  'not-animal',
  'duplicate',
  'wrong-info',
  'privacy',
  'inappropriate',
  'impersonation',
  'other',
])

// 운영자 판정 4종. POL-19. hide 는 제보를 hidden 으로, keep 은 신고를 기각
// request_edit 은 작성자 수정 요청, escalate 는 상위 검토자에게 이관
export const flagResolution = pgEnum('flag_resolution', [
  'keep',
  'hide',
  'request_edit',
  'escalate',
])
