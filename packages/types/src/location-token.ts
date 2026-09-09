import { z } from 'zod'

import { areaCodeSystem, locationSource } from './enums'

// 위치 참조 발급. WEB-04
// 세 경로가 모두 서버 발급 참조로 수렴하고 클라이언트는 좌표 숫자를 들고 다니지 않음

const OUT_OF_KOREA = '국내에서 목격한 위치만 등록할 수 있습니다'

const lat = z
  .number({ error: '위도가 필요합니다' })
  .min(33, OUT_OF_KOREA)
  .max(39, OUT_OF_KOREA)

const lng = z
  .number({ error: '경도가 필요합니다' })
  .min(124, OUT_OF_KOREA)
  .max(132, OUT_OF_KOREA)

/**
 * GPS 정확도 상한. 이보다 큰 오차는 5km 거리 점수를 계산할 근거가 못 됨
 * 값은 매칭 평가 후 확정할 기준. POL-08
 */
export const LOCATION_ACCURACY_LIMIT_M = 500

const areaFields = z.object({
  // 행정동 H, 법정동 B. 두 체계를 섞으면 지역 비교가 어긋남
  areaCodeSystem: areaCodeSystem.optional(),
  areaCode: z.string().max(20, '지역 코드가 너무 깁니다').optional(),
  areaName: z
    .string()
    .trim()
    .min(1, '지역을 선택해 주십시오')
    .max(100, '지역명이 너무 깁니다'),
  areaCodeVersion: z.string().max(20).optional(),
})

/**
 * 위치 참조 발급 요청
 * gps 와 place 는 좌표를 받고, manual_area 는 지역만 받아 좌표를 만들지 않음
 */
export const resolveLocation = z.discriminatedUnion('source', [
  areaFields.extend({
    source: z.literal('gps'),
    lat,
    lng,
    // 브라우저가 보고한 오차 반경. 큰 값은 거리 정보 부족으로 처리됨
    accuracyM: z
      .number({ error: '위치 정확도가 올바르지 않습니다' })
      .int()
      .nonnegative()
      .max(100_000)
      .optional(),
    // "지금 이곳에서 발견했나요" 확인. 확인 없이 현재 위치를 목격 위치로 쓰지 않음
    confirmedHere: z.literal(true, {
      error: '지금 이곳에서 발견했는지 확인해 주십시오',
    }),
  }),
  areaFields.extend({
    source: z.literal('place'),
    lat,
    lng,
  }),
  // 수동 지역 선택. 중심점을 실제 목격 좌표로 저장하지 않음
  areaFields.extend({
    source: z.literal('manual_area'),
  }),
])

export type ResolveLocation = z.infer<typeof resolveLocation>

/** 발급 응답. 좌표를 되돌려주지 않고 참조와 공개 표기만 내려줌 */
export type ResolvedLocation = {
  locationToken: string
  source: z.infer<typeof locationSource>
  areaName: string
  /** 거리 계산에 쓸 수 있는 위치인지. false 면 후보 화면이 정보 부족으로 표시 */
  usableForDistance: boolean
  expiresAt: string
}
