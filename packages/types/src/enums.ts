import { z } from 'zod'

// packages/db 의 pgEnum 과 값이 일치해야 함. 한쪽만 바꾸면 런타임에서 갈림
export const reportKind = z.enum(['sighting', 'lost', 'sheltered'], {
  error: '제보 종류가 올바르지 않습니다',
})
export const reportStatus = z.enum(
  ['draft', 'open', 'matched', 'resolved', 'hidden'],
  { error: '상태값이 올바르지 않습니다' },
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
export const flagReason = z.enum(
  ['not-animal', 'duplicate', 'wrong-info', 'privacy', 'other'],
  { error: '신고 사유를 선택해 주십시오' },
)
export const flagResolution = z.enum(['hide', 'keep'], {
  error: '판정값이 올바르지 않습니다',
})

export type ReportKind = z.infer<typeof reportKind>
export type ReportStatus = z.infer<typeof reportStatus>
export type AnimalType = z.infer<typeof animalType>
export type AnimalSize = z.infer<typeof animalSize>
export type AnimalSex = z.infer<typeof animalSex>
export type NeuterStatus = z.infer<typeof neuterStatus>
export type CareSituation = z.infer<typeof careSituation>
export type FlagReason = z.infer<typeof flagReason>
export type FlagResolution = z.infer<typeof flagResolution>
