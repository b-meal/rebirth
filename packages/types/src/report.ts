import { z } from 'zod'

import { animalSex, animalSize, animalType, neuterStatus, reportKind } from './enums'

// 대한민국 영역. 좌표 오입력과 해외 IP 장난을 1차로 거름
export const coordinates = z.object({
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
})

export type Coordinates = z.infer<typeof coordinates>

const conditionTag = z.string().min(1).max(20)

/** 제보 생성. 사진은 별도 업로드라 여기서는 개수만 받음 */
export const createReport = z.object({
  kind: reportKind.default('sighting'),
  animalType: animalType.default('unknown'),
  appearance: z.string().max(300).optional(),
  colors: z.array(z.string().min(1).max(20)).max(5).default([]),
  size: animalSize.default('unknown'),
  sex: animalSex.default('unknown'),
  neutered: neuterStatus.default('unknown'),
  conditionTags: z.array(conditionTag).max(8).default([]),
  collar: z.boolean().nullish(),
  injury: z.boolean().nullish(),
  earTip: z.boolean().nullish(),
  // 위치 권한을 거부하면 좌표 없이 지역명만 받음
  coordinates: coordinates.optional(),
  areaCode: z.string().max(20).optional(),
  areaName: z.string().max(100).optional(),
  occurredAt: z.coerce.date().max(new Date(), { message: '미래 시각은 넣을 수 없습니다' }),
  // 사용자가 AI 초안에서 고친 필드명. 정확도 측정용
  aiEditedFields: z.array(z.string().max(40)).max(20).default([]),
})

export type CreateReport = z.infer<typeof createReport>

export const updateReport = createReport.partial()
export type UpdateReport = z.infer<typeof updateReport>

/** 좌표도 지역명도 없으면 지도에도 목록에도 못 올림 */
export const createReportChecked = createReport.refine(
  (v) => v.coordinates !== undefined || v.areaName !== undefined,
  { message: '위치나 지역명 중 하나는 있어야 합니다', path: ['coordinates'] },
)

export const nearbyQuery = coordinates.extend({
  radiusM: z.coerce.number().int().min(100).max(20_000).default(3000),
  kind: reportKind.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type NearbyQuery = z.infer<typeof nearbyQuery>

// 사진은 서버에서 MIME 과 크기를 다시 확인
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024
export const PHOTO_MAX_COUNT = 5
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const photoUpload = z.object({
  contentType: z.enum(PHOTO_MIME_TYPES),
  bytes: z.number().int().positive().max(PHOTO_MAX_BYTES),
})

export type PhotoUpload = z.infer<typeof photoUpload>
