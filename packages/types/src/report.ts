import { z } from 'zod'

import { analyzeResult } from './analyze'
import {
  animalSex,
  animalSize,
  animalType,
  careSituation,
  flagReason,
  flagResolution,
  neuterStatus,
  reportKind,
  reportStatus,
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

/** 제보 생성. 사진은 별도 업로드라 여기서는 개수만 받음 */
export const createReport = z.object({
  kind: reportKind.default('sighting'),
  // 1단계 필수 입력이라 기본값을 두지 않음
  careSituation,
  animalType: animalType.default('unknown'),
  appearance: z.string().max(300, '외형 요약은 300자까지 넣을 수 있습니다').optional(),
  colors: z
    .array(z.string().min(1, '빈 털색은 넣을 수 없습니다').max(20, '털색은 20자까지 넣을 수 있습니다'))
    .max(5, '털색은 5개까지 고를 수 있습니다')
    .default([]),
  size: animalSize.default('unknown'),
  sex: animalSex.default('unknown'),
  neutered: neuterStatus.default('unknown'),
  conditionTags: z.array(conditionTag).max(8, '상태 태그는 8개까지 고를 수 있습니다').default([]),
  collar: z.boolean().nullish(),
  injury: z.boolean().nullish(),
  earTip: z.boolean().nullish(),
  // 위치 권한을 거부하면 좌표 없이 지역명만 받음
  coordinates: coordinates.optional(),
  areaCode: z.string().max(20, '지역 코드가 너무 깁니다').optional(),
  areaName: z.string().max(100, '지역명이 너무 깁니다').optional(),
  // new Date() 를 스키마에 넣으면 모듈 로드 시각에 고정되므로 refine 으로 매번 비교
  occurredAt: z.coerce
    .date({ error: '목격 시각이 올바르지 않습니다' })
    .refine((v) => v.getTime() <= Date.now(), '미래 시각은 넣을 수 없습니다'),
  // 사용자가 AI 초안에서 고친 필드명. 정확도 측정용
  aiEditedFields: z
    .array(z.string().max(40, '필드명이 너무 깁니다'))
    .max(20, '수정 필드는 20개까지 기록합니다')
    .default([]),
  // AI 초안 원본. 사용자 확정값과 분리해 보관하고 정확도 측정의 근거로 씀
  // 분석 실패로 직접 입력한 제보는 없음
  aiRaw: analyzeResult.optional(),
  aiModel: z.string().max(60, '모델명이 너무 깁니다').optional(),
  aiAnalyzedAt: z.coerce.date().optional(),
})

export type CreateReport = z.infer<typeof createReport>

export const updateReport = createReport.partial()
export type UpdateReport = z.infer<typeof updateReport>

/** 좌표도 지역명도 없으면 지도에도 목록에도 못 올림 */
export const createReportChecked = createReport.refine(
  (v) => v.coordinates !== undefined || v.areaName !== undefined,
  { message: '위치나 지역명 중 하나는 있어야 합니다', path: ['coordinates'] },
)

// 쿼리스트링은 전부 문자열로 오므로 좌표도 coerce 로 받음
export const nearbyQuery = z.object({
  lat: z.coerce
    .number({ error: '위도가 필요합니다' })
    .min(33, OUT_OF_KOREA)
    .max(39, OUT_OF_KOREA),
  lng: z.coerce
    .number({ error: '경도가 필요합니다' })
    .min(124, OUT_OF_KOREA)
    .max(132, OUT_OF_KOREA),
}).extend({
  radiusM: z.coerce
    .number({ error: '반경이 올바르지 않습니다' })
    .int('반경은 정수여야 합니다')
    .min(100, '반경은 100m 이상이어야 합니다')
    .max(20_000, '반경은 20000m 까지만 됩니다')
    .default(3000),
  kind: reportKind.optional(),
  limit: z.coerce
    .number({ error: '건수가 올바르지 않습니다' })
    .int('건수는 정수여야 합니다')
    .min(1, '건수는 1 이상이어야 합니다')
    .max(100, '한 번에 100건까지 받을 수 있습니다')
    .default(50),
})

export type NearbyQuery = z.infer<typeof nearbyQuery>

// 사진은 서버에서 MIME 과 크기를 다시 확인
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024
export const PHOTO_MAX_COUNT = 5
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const photoUpload = z.object({
  contentType: z.enum(PHOTO_MIME_TYPES, { error: 'JPG, PNG, WEBP 만 됩니다' }),
  bytes: z
    .number({ error: '사진 용량을 확인할 수 없습니다' })
    .int('용량이 올바르지 않습니다')
    .positive('용량이 올바르지 않습니다')
    .max(PHOTO_MAX_BYTES, '8MB 까지 올릴 수 있습니다. 사진을 다시 골라 주십시오'),
})

export type PhotoUpload = z.infer<typeof photoUpload>

/* 신고와 검수 */

// 화면 기획서 S-006 신고 사유 5종
export const FLAG_REASON_LABEL: Record<FlagReason, string> = {
  'not-animal': '사진에 동물이 보이지 않음',
  duplicate: '같은 개체 중복 제보로 보임',
  'wrong-info': '내용이 사실과 다름',
  privacy: '개인정보가 노출됨',
  other: '그 외',
}

export const createFlag = z.object({
  reason: flagReason,
  detail: z.string().max(300, '내용은 300자까지 넣을 수 있습니다').optional(),
})

export type CreateFlag = z.infer<typeof createFlag>

// 운영자 판정. hide 는 status 를 hidden 으로, keep 은 신고를 기각
export const moderationDecision = z.object({
  decision: flagResolution,
  note: z.string().max(300, '메모는 300자까지 넣을 수 있습니다').optional(),
})

export type ModerationDecision = z.infer<typeof moderationDecision>

/* 어드민 목록 조회 */

export const adminReportQuery = z.object({
  kind: reportKind.optional(),
  status: reportStatus.optional(),
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
 * 실종 신고 등록. 연락처를 받지 않고 조회 토큰만 발급함
 * 목격 제보와 열을 공유하지만 필수 입력이 달라 스키마를 따로 둠
 */
export const createLostReport = z.object({
  animalType: animalType.default('unknown'),
  appearance: z.string().max(300, '특징은 300자까지 넣을 수 있습니다').optional(),
  colors: z
    .array(z.string().min(1, '빈 털색은 넣을 수 없습니다').max(20, '털색은 20자까지 넣을 수 있습니다'))
    .max(5, '털색은 5개까지 고를 수 있습니다')
    .default([]),
  size: animalSize.default('unknown'),
  sex: animalSex.default('unknown'),
  neutered: neuterStatus.default('unknown'),
  collar: z.boolean().nullish(),
  injury: z.boolean().nullish(),
  earTip: z.boolean().nullish(),
  // 마지막 목격 장소
  coordinates: coordinates.optional(),
  areaCode: z.string().max(20, '지역 코드가 너무 깁니다').optional(),
  areaName: z.string().max(100, '지역명이 너무 깁니다').optional(),
  // 마지막 목격 시각
  occurredAt: z.coerce
    .date({ error: '마지막 목격 시각이 올바르지 않습니다' })
    .refine((v) => v.getTime() <= Date.now(), '미래 시각은 넣을 수 없습니다'),
})

export type CreateLostReport = z.infer<typeof createLostReport>

/** 마지막 목격 장소가 없으면 후보를 찾을 수 없음 */
export const createLostReportChecked = createLostReport.refine(
  (v) => v.coordinates !== undefined || v.areaName !== undefined,
  { message: '마지막 목격 장소를 알려 주십시오', path: ['coordinates'] },
)

// 토큰은 URL 에 담겨 공유되지 않아야 하므로 추측이 어려운 길이로 발급
export const LOST_TOKEN_BYTES = 24
