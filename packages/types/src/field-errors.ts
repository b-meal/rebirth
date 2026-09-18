import type { z } from 'zod'

// zod 오류를 필드별 첫 메시지로 줄임. 화면은 칸마다 하나만 보여 주면 됨
// 서버 액션과 클라이언트 폼이 같은 모양을 써야 오류가 같은 자리에 붙음

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || key in out) continue
    out[key] = issue.message
  }
  return out
}
