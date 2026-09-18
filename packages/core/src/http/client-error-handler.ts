import "server-only";

import { z } from "zod";

import { recordError } from "./error-sink";
import { RATE_LIMITS, checkRateLimit, clientKey } from "./rate-limit";

// 화면에서 난 오류를 받아 적는 자리
//
// 브라우저 콘솔은 그 사람 기기에만 남아 저장이 안 된다는 제보를 받아도 볼 것이 없음
// 서버 실패와 같은 표에 모으되 태그에 client. 를 붙여 어느 쪽에서 난 것인지 구별함
//
// 사진, 좌표, 토큰, 사용자 식별자는 받지 않음. 들어와도 저장 직전에 한 번 더 지움

/** 한 줄이 이보다 길면 잘라 넣음. 스택은 첫 몇 프레임이면 충분함 */
const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;

const bodySchema = z.object({
  // 어디서 났는지. 화면이 정해 보내는 값이라 좁게 받음
  tag: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9.-]*$/, "태그 형식이 올바르지 않습니다"),
  message: z.string().min(1).max(MAX_MESSAGE),
  stack: z.string().max(MAX_STACK).optional(),
  // 어느 화면이었는지. 질의 문자열은 값이 섞여 오므로 경로만 받음
  path: z
    .string()
    .max(200)
    .regex(/^\/[^?#\s]*$/, "경로 형식이 올바르지 않습니다")
    .optional(),
});

/* POST /api/draft/client-error  화면에서 난 오류를 받아 적음. 본문 없이 204 로 답함 */

export async function clientErrorHandler(request: Request): Promise<Response> {
  const accepted = new Response(null, { status: 204 });

  // 넘치면 조용히 버림. 기록이 밀린다고 화면에서 할 일이 생기지는 않음
  if (!checkRateLimit(clientKey(request, "clientError"), RATE_LIMITS.clientError).allowed) {
    return accepted;
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_STACK + MAX_MESSAGE + 500) return accepted;
    raw = JSON.parse(text);
  } catch {
    return accepted;
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return accepted;

  // Error 로 만들어 보내면 서버 실패와 같은 모양으로 지문과 마스킹을 거침
  const error = new Error(parsed.data.message);
  error.stack = parsed.data.stack;

  await recordError("failure", `client.${parsed.data.tag}`, error, {
    ...(parsed.data.path && { path: parsed.data.path }),
  });

  return accepted;
}
