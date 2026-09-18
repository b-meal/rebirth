import { z } from 'zod'

// 구조·보호 요청 입력 규칙
// 급한 사람이 쓰는 폼이라 최소한만 받음. 상태는 못 적는 경우가 있어 선택으로 둠

/**
 * 칸마다 받는 최대 길이
 * 제보에서 끌어와 채워 넣는 값도 이 자에 맞춰야 함
 * 넘긴 값을 그대로 채우면 사용자가 적지도 않은 값으로 짧게 적어 달라는 오류를 봄
 */
export const RESCUE_LIMIT = { where: 200, what: 100, condition: 300 } as const

export const rescueRequestInput = z.object({
  where: z
    .string()
    .trim()
    .min(2, { error: '어디인지 알려 주세요' })
    .max(RESCUE_LIMIT.where, { error: '조금 더 짧게 적어 주세요' }),
  what: z
    .string()
    .trim()
    .min(1, { error: '어떤 동물인지 알려 주세요' })
    .max(RESCUE_LIMIT.what, { error: '조금 더 짧게 적어 주세요' }),
  condition: z
    .string()
    .trim()
    .max(RESCUE_LIMIT.condition, { error: '조금 더 짧게 적어 주세요' })
    .optional(),
  /**
   * 어느 발견 제보에서 왔는지
   * 사용자가 적는 값이 아니라 형식이 어긋나면 오류를 내지 않고 조용히 버림
   * 급한 사람을 자기가 건드리지 않은 칸 때문에 멈춰 세우지 않음
   */
  reportId: z.uuid().optional().catch(undefined),
})

export type RescueRequestInput = z.infer<typeof rescueRequestInput>

/** 제보에서 끌어온 값을 칸 길이에 맞춰 줄임 */
export function fitRescueField(
  value: string,
  field: keyof typeof RESCUE_LIMIT,
): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, RESCUE_LIMIT[field])
}

/**
 * 운영자가 한 줄로 읽을 수 있게 묶음
 * support_requests.body 의 최소 길이 제약도 이 형식이면 넘김
 * 어느 제보 건인지는 본문에 적지 않고 related_report_id 열에 넣음
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
