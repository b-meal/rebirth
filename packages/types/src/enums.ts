import { z } from 'zod'

// packages/db 의 pgEnum 과 값이 일치해야 함. 한쪽만 바꾸면 런타임에서 갈림
export const reportKind = z.enum(['sighting', 'lost', 'sheltered'], {
  error: '제보 종류가 올바르지 않습니다',
})

// 공개 여부. 운영자는 hidden↔public 만 처리하고 deleted→public 은 금지
export const visibility = z.enum(['public', 'hidden', 'deleted'], {
  error: '공개 상태가 올바르지 않습니다',
})

// 진행 상태. 공개 여부와 독립된 축이라 한쪽이 다른 쪽을 바꾸지 않음
// 발견은 active|closed, 실종은 searching|resolved|closed 만 씀
export const lifecycle = z.enum(
  ['active', 'closed', 'searching', 'resolved'],
  { error: '진행 상태가 올바르지 않습니다' },
)

export const animalType = z.enum(['dog', 'cat', 'other', 'unknown'], {
  error: '동물 종류를 선택해 주십시오',
})
export const animalSize = z.enum(['small', 'medium', 'large', 'unknown'], {
  error: '크기를 선택해 주십시오',
})
export const animalSex = z.enum(['male', 'female', 'unknown'], {
  error: '성별이 올바르지 않습니다',
})
export const neuterStatus = z.enum(['done', 'not_done', 'unknown'], {
  error: '중성화 여부가 올바르지 않습니다',
})
export const careSituation = z.enum(['roaming', 'in_care', 'unknown'], {
  error: '보호 상황을 선택해 주십시오',
})

// SNS 로그인 제공자. Supabase Auth 의 provider 문자열과 같은 값
export const authProvider = z.enum(['google', 'kakao'], {
  error: '지원하지 않는 로그인 방식입니다',
})
// 문의·권리 요청 분류. WEB-24
export const supportRequestKind = z.enum(
  [
    'manage_token_lost',
    'deletion',
    'correction',
    'privacy_exposure',
    'general',
  ],
  { error: '문의 유형을 선택해 주십시오' },
)

// 접수 처리 상태
export const supportStatus = z.enum(
  ['received', 'reviewing', 'need_more_info', 'answered', 'closed'],
  { error: '처리 상태가 올바르지 않습니다' },
)

// 법적 고지 종류. WEB-22, WEB-23
export const legalDocType = z.enum(
  ['privacy', 'terms', 'location', 'notice', 'safety_guide'],
  { error: '문서 종류가 올바르지 않습니다' },
)

// 동의 종류. 필수와 선택을 섞으면 일괄 동의가 되어 POL-38 위반
export const consentKind = z.enum(
  ['required_terms', 'required_privacy', 'optional_ai', 'optional_location'],
  { error: '동의 종류가 올바르지 않습니다' },
)

// 업로드 파일 검증 상태. 저품질·다중동물은 AI 경고라 여기 넣지 않음
export const uploadStatus = z.enum(['processing', 'ready', 'failed'], {
  error: '업로드 상태가 올바르지 않습니다',
})

// 위치 출처. POL-08. manual_area 는 정확 좌표가 없어 거리 점수를 받지 않음
export const locationSource = z.enum(['gps', 'place', 'manual_area'], {
  error: '위치 출처가 올바르지 않습니다',
})

// 행정동 H, 법정동 B. 두 체계를 섞으면 지역 비교가 어긋남
export const areaCodeSystem = z.enum(['H', 'B'], {
  error: '행정구역 코드 체계가 올바르지 않습니다',
})

// 종료·삭제 사유. WEB-17
export const closeReason = z.enum(
  ['found', 'duplicate', 'canceled', 'outdated', 'other'],
  { error: '사유를 선택해 주십시오' },
)

// WEB-10 신고 사유 7종. 익명 연락 도입에 따라 소유권·사칭 분류가 늘었음
export const flagReason = z.enum(
  [
    'not-animal',
    'duplicate',
    'wrong-info',
    'privacy',
    'inappropriate',
    'impersonation',
    'other',
  ],
  { error: '신고 사유를 선택해 주십시오' },
)

// 운영자 판정. POL-19 의 4종. request_edit 은 작성자에게 수정을 요청
export const flagResolution = z.enum(
  ['keep', 'hide', 'request_edit', 'escalate'],
  { error: '판정값이 올바르지 않습니다' },
)

// 커뮤니티 글 분류. 제보로 올리기 애매한 이야기를 담는 자리
export const communityCategory = z.enum(
  ['sighting_talk', 'reunion', 'care_tip', 'neighborhood'],
  { error: '주제를 선택해 주십시오' },
)

export type ReportKind = z.infer<typeof reportKind>
export type Visibility = z.infer<typeof visibility>
export type Lifecycle = z.infer<typeof lifecycle>
export type AnimalType = z.infer<typeof animalType>
export type AnimalSize = z.infer<typeof animalSize>
export type AnimalSex = z.infer<typeof animalSex>
export type NeuterStatus = z.infer<typeof neuterStatus>
export type CareSituation = z.infer<typeof careSituation>
export type AuthProvider = z.infer<typeof authProvider>
export type FlagReason = z.infer<typeof flagReason>
export type FlagResolution = z.infer<typeof flagResolution>
export type LocationSource = z.infer<typeof locationSource>
export type AreaCodeSystem = z.infer<typeof areaCodeSystem>
export type CloseReason = z.infer<typeof closeReason>
export type CommunityCategory = z.infer<typeof communityCategory>
export type SupportRequestKind = z.infer<typeof supportRequestKind>
export type SupportStatus = z.infer<typeof supportStatus>
export type LegalDocType = z.infer<typeof legalDocType>
export type ConsentKind = z.infer<typeof consentKind>
export type UploadStatus = z.infer<typeof uploadStatus>

// kind 별로 허용되는 lifecycle. DB CHECK 제약과 같은 규칙
export const LIFECYCLE_BY_KIND = {
  sighting: ['active', 'closed'],
  sheltered: ['active', 'closed'],
  lost: ['searching', 'resolved', 'closed'],
} as const satisfies Record<ReportKind, readonly Lifecycle[]>

/** 발견 제보에 resolved, 실종 신고에 active 가 들어오는 것을 막음 */
export function isLifecycleAllowed(kind: ReportKind, value: Lifecycle) {
  return (LIFECYCLE_BY_KIND[kind] as readonly Lifecycle[]).includes(value)
}

/** kind 별 초기 진행 상태. 저장 시점에 서버가 정함 */
export const INITIAL_LIFECYCLE = {
  sighting: 'active',
  sheltered: 'active',
  lost: 'searching',
} as const satisfies Record<ReportKind, Lifecycle>
