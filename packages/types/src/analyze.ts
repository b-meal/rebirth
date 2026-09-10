import { z } from 'zod'

import { animalSize, animalType } from './enums'

/**
 * POST /api/analyze 응답. Anthropic structured output 으로 강제하는 모양이라
 * 필드를 바꾸면 도구 정의와 reports.ai_raw 도 같이 바꿔야 함
 */
export const analyzeResult = z.object({
  animalType,
  // 품종을 단정하지 않음. "흰색 소형견, 말티즈 계열 추정" 같은 형태
  appearance: z.string().min(1).max(300),
  color: z.array(z.string().min(1).max(20)).max(5),
  size: animalSize,
  condition: z.string().max(300),
  // 제보 글 본문 초안. appearance 아래에 붙여 한 열에 저장하므로 합계가 500자를 넘지 않게 짧게 둠
  story: z.string().max(180),
  collarOrHarness: z.boolean().nullable(),
  visibleInjury: z.boolean().nullable(),
  earTip: z.boolean().nullable(),
  confidence: z.number().min(0).max(1),
  // 사진 품질, 비동물, 재촬영 안내
  warnings: z.array(z.string().max(200)).max(5),
})

export type AnalyzeResult = z.infer<typeof analyzeResult>

export const analyzeRequest = z.object({
  reportId: z.uuid(),
})

export type AnalyzeRequest = z.infer<typeof analyzeRequest>

/** 비동물이거나 신뢰도가 낮으면 사용자에게 재촬영을 권함 */
export const RETAKE_CONFIDENCE = 0.4

export function needsRetake(result: AnalyzeResult) {
  return result.animalType === 'unknown' || result.confidence < RETAKE_CONFIDENCE
}
