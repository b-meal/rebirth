import { z } from 'zod'

// 구조 요청 입력 규칙
// 급한 사람이 쓰는 폼이라 최소한만 받음. 상태는 못 적는 경우가 있어 선택으로 둠

export const rescueRequestInput = z.object({
  where: z
    .string()
    .trim()
    .min(2, { error: '어디인지 알려 주세요' })
    .max(200, { error: '조금 더 짧게 적어 주세요' }),
  what: z
    .string()
    .trim()
    .min(1, { error: '어떤 동물인지 알려 주세요' })
    .max(100, { error: '조금 더 짧게 적어 주세요' }),
  condition: z
    .string()
    .trim()
    .max(300, { error: '조금 더 짧게 적어 주세요' })
    .optional(),
})

export type RescueRequestInput = z.infer<typeof rescueRequestInput>

/**
 * 운영자가 한 줄로 읽을 수 있게 묶음
 * support_requests.body 의 최소 길이 제약도 이 형식이면 넘김
 */
export function composeRescueBody(input: RescueRequestInput): string {
  const lines = [`위치: ${input.where}`, `동물: ${input.what}`]
  if (input.condition) lines.push(`상태: ${input.condition}`)
  return lines.join('\n')
}

/** zod 오류를 필드별 첫 메시지로 줄임. 화면은 한 번에 하나만 보여 주면 됨 */
export function rescueFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || key in out) continue
    out[key] = issue.message
  }
  return out
}
