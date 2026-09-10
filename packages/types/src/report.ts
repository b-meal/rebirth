import { z } from 'zod'

import { analyzeResult } from './analyze'
import {
  animalSex,
  animalSize,
  animalType,
  careSituation,
  flagReason,
  flagResolution,
  lifecycle,
  neuterStatus,
  reportKind,
  visibility,
  type FlagReason,
} from './enums'

const OUT_OF_KOREA = '국내에서 목격한 위치만 등록할 수 있습니다'

// 대한민국 영역. 좌표 오입력과 해외 IP 장난을 1차로 거름
export const coordinates = z.object({
  lat: z.number({ error: '위도가 필요합니다' }).min(33, OUT_OF_KOREA).max(39, OUT_OF_KOREA),
  lng: z
    .number({ error: '경도가 필요합니다' })
    .min(124, OUT_OF_KOREA)
    .max(132, OUT_OF_KOREA),
})

export type Coordinates = z.infer<typeof coordinates>

const conditionTag = z.string().min(1, '빈 태그는 넣을 수 없습니다').max(20, '태그는 20자까지 넣을 수 있습니다')

/* 사진 제약. 스키마보다 먼저 선언해 uploadIds 상한에 그대로 씀 */

// 사진은 서버에서 MIME 과 magic bytes, 크기를 다시 확인. POL-07
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024
export const PHOTO_MAX_COUNT = 5
/** 전체 합계 상한. 한 제보가 스토리지를 과하게 쓰는 것을 막음 */
export const PHOTO_TOTAL_MAX_BYTES = 24 * 1024 * 1024
/** 재인코딩 후 장변 */
export const PHOTO_LONG_EDGE = 1568

// HEIC 는 입력으로 받되 서버 디코딩이 안 되는 환경에서는 변환을 안내함
export const PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type PhotoMimeType = (typeof PHOTO_MIME_TYPES)[number]

/** 목격 시각이 서버보다 이만큼 미래면 기기 시계 오차로 보고 재확인을 요구함. POL-16 */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60_000

/** 외형 설명 길이. WEB-02 의 1~500자 */
const APPEARANCE_MIN = 1
const APPEARANCE_MAX = 500

// 사용자가 관찰한 값. AI 초안을 그대로 두거나 고쳐서 확정함
const observedFields = z.object({
  animalType: animalType.default('unknown'),
  // AI 라벨링이 채우는 품종 추정. 확인이 안 되면 비움
  breedGuess: z
    .string()
    .trim()
    .max(30, '품종 추정은 30자까지 넣을 수 있습니다')
    .nullish(),
  appearance: z
    .string()
    .trim()
    .min(APPEARANCE_MIN, '외형 설명을 적어 주십시오')
    .max(APPEARANCE_MAX, `외형 설명은 ${APPEARANCE_MAX}자까지 넣을 수 있습니다`),
  colors: z
    .array(z.string().min(1, '빈 털색은 넣을 수 없습니다').max(20, '털색은 20자까지 넣을 수 있습니다'))
    .max(5, '털색은 5개까지 고를 수 있습니다')
    .default([]),
  size: animalSize.default('unknown'),
  sex: animalSex.default('unknown'),
  neutered: neuterStatus.default('unknown'),
  conditionTags: z.array(conditionTag).max(8, '상태 태그는 8개까지 고를 수 있습니다').default([]),
  // 있음/없음/모름 3값. null 이 모름이고 false 와 다름
  collar: z.boolean().nullish(),
  injury: z.boolean().nullish(),
  earTip: z.boolean().nullish(),
})

// 필수 동의와 선택 동의를 분리함. 한 칸으로 묶으면 일괄 동의가 되어 POL-38 위반
export const consents = z.object({
  requiredTerms: z.literal(true, {
    error: '이용약관에 동의해야 공개 저장할 수 있습니다',
  }),
  requiredPrivacy: z.literal(true, {
    error: '개인정보 처리에 동의해야 공개 저장할 수 있습니다',
  }),
  // 거부해도 직접 입력으로 제보를 마칠 수 있음
  optionalAi: z.boolean().default(false),
  optionalLocation: z.boolean().default(false),
  // 동의 시점의 문서 버전. 나중에 어느 판본에 동의했는지 답할 수 있어야 함
  documentVersion: z.string().min(1, '동의 문서 버전이 없습니다').max(40),
})

export type Consents = z.infer<typeof consents>

/**
 * 제보 저장. WEB-06
 * 사진과 위치는 서버가 발급한 참조로만 받음
 * 원본 좌표를 본문에 담지 않아 브라우저에 정확 좌표가 남지 않음
 */
export const createReport = observedFields.extend({
  kind: reportKind.default('sighting'),
  // 1단계 필수 입력이라 기본값을 두지 않음
  careSituation,
  // 초안 세션이 소유한 업로드만 통과함. 대표 사진이 첫 번째
  uploadIds: z
    .array(z.uuid('사진 참조가 올바르지 않습니다'))
    .min(1, '사진을 한 장 올려 주십시오')
    .max(PHOTO_MAX_COUNT, `사진은 ${PHOTO_MAX_COUNT}장까지 올릴 수 있습니다`),
  // 서버가 발급한 위치 참조. 좌표 숫자를 클라이언트가 들고 다니지 않음
  locationToken: z.uuid('목격 장소를 다시 선택해 주십시오'),
  // 지형물 메모. 좌표보다 찾아가기 쉽고 정밀도가 낮아 오히려 안전
  landmarkNote: z
    .string()
    .trim()
    .max(100, '지형물 메모는 100자까지 넣을 수 있습니다')
    .optional(),
  // new Date() 를 스키마에 넣으면 모듈 로드 시각에 고정되므로 refine 으로 매번 비교
  occurredAt: z.coerce
    .date({ error: '목격 시각이 올바르지 않습니다' })
    .refine(
      (v) => v.getTime() <= Date.now() + CLOCK_SKEW_TOLERANCE_MS,
      '목격 시각이 현재보다 뒤입니다. 시각을 다시 확인해 주십시오',
    ),
  consents,
  // 응답이 유실돼도 같은 키로 결과를 먼저 확인함. 이중 탭이 두 건을 만들지 않음
  idempotencyKey: z
    .string()
    .min(16, '중복 방지 키가 너무 짧습니다')
    .max(64, '중복 방지 키가 너무 깁니다'),
  // 사용자가 AI 초안에서 고친 필드명. 서버가 원본과 대조해 다시 계산함
  aiEditedFields: z
    .array(z.string().max(40, '필드명이 너무 깁니다'))
    .max(20, '수정 필드는 20개까지 기록합니다')
    .default([]),
  // 분석 작업 참조. 서버가 이 작업의 원본과 최종값을 비교함
  analysisJobId: z.uuid().optional(),
})

export type CreateReport = z.infer<typeof createReport>

/**
 * 기존 기록 수정. WEB-35
 * 사진과 위치는 각자 다른 경로로 바꾸므로 여기서는 관찰값과 시각만 받음
 */
export const updateReport = observedFields.partial().extend({
  careSituation: careSituation.optional(),
  landmarkNote: z
    .string()
    .trim()
    .max(100, '지형물 메모는 100자까지 넣을 수 있습니다')
    .optional(),
  occurredAt: z.coerce
    .date({ error: '목격 시각이 올바르지 않습니다' })
    .refine(
      (v) => v.getTime() <= Date.now() + CLOCK_SKEW_TOLERANCE_MS,
      '목격 시각이 현재보다 뒤입니다. 시각을 다시 확인해 주십시오',
    )
    .optional(),
  // 낙관적 락. 어긋나면 409 로 최신값을 돌려줌
  version: z.number().int().positive('버전이 올바르지 않습니다'),
})

export type UpdateReport = z.infer<typeof updateReport>

/* 공개 목록 */

/** 기본 조회 기간과 확장 선택지. POL-16 */
export const LIST_DEFAULT_DAYS = 7
export const LIST_PERIOD_DAYS = [7, 30, 90] as const

/** 한 번에 받는 건수. WEB-08 의 20건씩 */
export const LIST_PAGE_SIZE = 20

/**
 * 공개 목록 질의. WEB-08, WEB-34
 * 좌표를 받지 않음. 지역은 행정구역 코드로만 좁히고 거리 정렬을 제공하지 않음
 */
export const listQuery = z.object({
  kind: reportKind.optional(),
  // 자유 검색어. 외형 문장과 지역명, 털색에서 부분 일치로 찾음
  q: z.string().trim().max(40, '검색어가 너무 깁니다').optional(),
  // 행정구역 코드. 상위 코드를 주면 하위를 포함함
  areaCode: z.string().max(20, '지역 코드가 너무 깁니다').optional(),
  animalType: animalType.optional(),
  size: animalSize.optional(),
  // 쿼리스트링은 콤마로 옴. 고른 색 중 하나라도 겹치면 결과에 포함
  colors: z
    .string()
    .max(200, '털색 조건이 너무 깁니다')
    .transform((v) =>
      v
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 5),
    )
    .optional(),
  days: z.coerce
    .number({ error: '기간이 올바르지 않습니다' })
    .int('기간은 정수여야 합니다')
    .refine(
      (v) => (LIST_PERIOD_DAYS as readonly number[]).includes(v),
      `기간은 ${LIST_PERIOD_DAYS.join(', ')}일 중에서 고를 수 있습니다`,
    )
    .default(LIST_DEFAULT_DAYS),
  // 종료 기록은 기본 제외하고 필터로만 확인 가능
  includeClosed: z.stringbool().default(false),
  // 최신순 커서. 목격 시각과 id 를 함께 담아 동점에서도 어긋나지 않음
  cursor: z.string().max(120, '커서가 올바르지 않습니다').optional(),
})

export type ListQuery = z.infer<typeof listQuery>

/* 사진 업로드 */

export const photoUpload = z.object({
  contentType: z.enum(PHOTO_MIME_TYPES, {
    error: 'JPG, PNG, WEBP, HEIC 만 올릴 수 있습니다',
  }),
  bytes: z
    .number({ error: '사진 용량을 확인할 수 없습니다' })
    .int('용량이 올바르지 않습니다')
    .positive('용량이 올바르지 않습니다')
    .max(PHOTO_MAX_BYTES, '8MB 까지 올릴 수 있습니다. 사진을 다시 골라 주십시오'),
})

export type PhotoUpload = z.infer<typeof photoUpload>

/* 신고와 검수 */

// WEB-10 신고 사유 7종
export const FLAG_REASON_LABEL: Record<FlagReason, string> = {
  privacy: '개인정보가 노출됨',
  inappropriate: '부적절한 사진이나 문구',
  'not-animal': '사진에 동물이 보이지 않음',
  'wrong-info': '위치나 시각이 잘못됨',
  duplicate: '같은 개체 중복 제보로 보임',
  impersonation: '소유권이나 사칭 문제',
  other: '그 외',
}

// 기타 사유는 무엇이 문제인지 알 수 없어 최소 길이를 요구함
const FLAG_OTHER_MIN = 10

export const createFlag = z
  .object({
    reason: flagReason,
    detail: z.string().max(500, '내용은 500자까지 넣을 수 있습니다').optional(),
  })
  .refine(
    (v) => v.reason !== 'other' || (v.detail?.trim().length ?? 0) >= FLAG_OTHER_MIN,
    {
      error: `그 외를 고르면 무엇이 문제인지 ${FLAG_OTHER_MIN}자 이상 적어 주십시오`,
      path: ['detail'],
    },
  )

export type CreateFlag = z.infer<typeof createFlag>

/* 관심 표시 */

/** 관심 켜고 끄기. 상태를 클라이언트가 보내고 서버가 그대로 맞춤 */
export const toggleInterest = z.object({
  interested: z.boolean({ error: '관심 여부가 필요합니다' }),
})

export type ToggleInterest = z.infer<typeof toggleInterest>

/* 댓글 */

/** 한 제보에 붙여 보여 주는 댓글 수. 넘으면 오래된 것부터 접음 */
export const COMMENT_PAGE_SIZE = 100

const COMMENT_MAX = 300

/**
 * 댓글 작성. 비로그인이라 본문만 받고 작성자 정보를 받지 않음
 * 표시명은 서버가 제보 안에서만 유효한 번호로 매김
 */
export const createComment = z.object({
  body: z
    .string()
    .trim()
    .min(1, '댓글을 적어 주십시오')
    .max(COMMENT_MAX, `댓글은 ${COMMENT_MAX}자까지 넣을 수 있습니다`),
})

export type CreateComment = z.infer<typeof createComment>

// 운영자 판정. hide 는 status 를 hidden 으로, keep 은 신고를 기각
export const moderationDecision = z.object({
  decision: flagResolution,
  note: z.string().max(300, '메모는 300자까지 넣을 수 있습니다').optional(),
})

export type ModerationDecision = z.infer<typeof moderationDecision>

/* 어드민 목록 조회 */

export const adminReportQuery = z.object({
  kind: reportKind.optional(),
  visibility: visibility.optional(),
  lifecycle: lifecycle.optional(),
  // 신고가 접수된 제보만 추림
  flagged: z.stringbool().optional(),
  areaCode: z.string().max(20, '지역 코드가 너무 깁니다').optional(),
  limit: z.coerce
    .number({ error: '건수가 올바르지 않습니다' })
    .int('건수는 정수여야 합니다')
    .min(1, '건수는 1 이상이어야 합니다')
    .max(100, '한 번에 100건까지 받을 수 있습니다')
    .default(30),
  offset: z.coerce
    .number({ error: '시작 위치가 올바르지 않습니다' })
    .int('시작 위치는 정수여야 합니다')
    .min(0, '시작 위치는 0 이상이어야 합니다')
    .default(0),
})

export type AdminReportQuery = z.infer<typeof adminReportQuery>

/* 실종 신고 */

/**
 * 실종 신고 등록. WEB-11
 * 연락처와 동물등록번호를 받지 않고 관리 주소만 발급함
 * 목격 제보와 열을 공유하지만 필수 입력이 달라 스키마를 따로 둠
 */
export const createLostReport = observedFields.extend({
  uploadIds: z
    .array(z.uuid('사진 참조가 올바르지 않습니다'))
    .min(1, '사진을 한 장 올려 주십시오')
    .max(PHOTO_MAX_COUNT, `사진은 ${PHOTO_MAX_COUNT}장까지 올릴 수 있습니다`),
  // 마지막 목격 장소. 제보와 같은 위치 정책을 씀
  locationToken: z.uuid('마지막 목격 장소를 다시 선택해 주십시오'),
  landmarkNote: z
    .string()
    .trim()
    .max(100, '지형물 메모는 100자까지 넣을 수 있습니다')
    .optional(),
  // 마지막 목격 시각
  occurredAt: z.coerce
    .date({ error: '마지막 목격 시각이 올바르지 않습니다' })
    .refine(
      (v) => v.getTime() <= Date.now() + CLOCK_SKEW_TOLERANCE_MS,
      '마지막 목격 시각이 현재보다 뒤입니다. 시각을 다시 확인해 주십시오',
    ),
  consents,
  idempotencyKey: z
    .string()
    .min(16, '중복 방지 키가 너무 짧습니다')
    .max(64, '중복 방지 키가 너무 깁니다'),
})

export type CreateLostReport = z.infer<typeof createLostReport>
