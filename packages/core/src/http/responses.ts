import type { z } from "zod";

// 라우트 응답 형태를 한곳에서 정함. web 과 admin 이 같은 본문 모양을 씀
// NextResponse 대신 표준 Response 를 써서 이 패키지가 next 에 묶이지 않게 함

/**
 * 동적 세그먼트 컨텍스트. Next.js 15 부터 params 가 Promise 로 옴
 * next 의 RouteContext 를 쓰면 이 패키지가 프레임워크에 묶이므로 직접 정의함
 */
export type RouteContext<P = { id: string }> = { params: Promise<P> };

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}

export function badRequest(
  message: string,
  errors?: Record<string, string>,
): Response {
  return Response.json({ message, ...(errors && { errors }) }, { status: 400 });
}

export function notFound(message: string): Response {
  return Response.json({ message }, { status: 404 });
}

export function unauthorized(message = "권한이 없습니다"): Response {
  return Response.json({ message }, { status: 401 });
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { message: "잠시 후에 다시 시도해 주십시오" },
    {
      status: 429,
      headers: { "retry-after": String(retryAfterSeconds) },
    },
  );
}

/** 서버 오류. 원인은 로그에만 남기고 본문에는 넣지 않음 */
export function serverError(tag: string, error: unknown): Response {
  console.error(`[${tag}]`, error);
  return Response.json(
    { message: "처리 중 문제가 생겼습니다. 잠시 후에 다시 시도해 주십시오" },
    { status: 500 },
  );
}

export function ok<T>(body: T, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    // 제보 데이터는 캐시하지 않음. 숨김 처리가 즉시 반영돼야 함
    headers: { "cache-control": "no-store", ...init?.headers },
  });
}

/** zod 로 JSON 본문을 검증. 실패하면 400 Response 를 돌려줌 */
export async function parseJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { response: Response }> {
  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return { response: badRequest("요청 본문이 올바르지 않습니다") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: badRequest("입력값을 확인해 주십시오", fieldErrors(parsed.error)),
    };
  }
  return { data: parsed.data };
}
