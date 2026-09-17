import type { z } from "zod";

// 라우트 응답 형태를 한곳에서 정함. web 과 admin 이 같은 본문 모양을 씀
// NextResponse 대신 표준 Response 를 써서 이 패키지가 next 에 묶이지 않게 함

/**
 * 동적 세그먼트 컨텍스트. Next.js 15 부터 params 가 Promise 로 옴
 * next 의 RouteContext 를 쓰면 이 패키지가 프레임워크에 묶이므로 직접 정의함
 */
export type RouteContext<P = { id: string }> = { params: Promise<P> };

/**
 * 공통 오류 코드. WEB-27
 * 숨김·삭제·없는 ID 는 모두 not_found 로 답함. 어느 쪽인지 알려주면
 * 그 자체가 정찰 수단이 됨
 */
export const ERROR_CODES = {
  invalidInput: "invalid_input",
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  notFound: "not_found",
  conflict: "conflict",
  payloadTooLarge: "payload_too_large",
  unsupportedMediaType: "unsupported_media_type",
  tooManyRequests: "too_many_requests",
  serviceUnavailable: "service_unavailable",
  serverError: "server_error",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * 공통 오류 본문. WEB-27 의 { code, fieldErrors, requestId, retryAfter }
 * requestId 만 노출하고 스택·키·좌표·토큰은 담지 않음
 */
export type ErrorBody = {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId: string;
  retryAfter?: number;
};

/** 지원 문의에 전달할 수 있는 짧은 식별자. 로그와 대조하는 유일한 값 */
export function newRequestId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}

type ErrorInit = {
  status: number;
  code: ErrorCode;
  message: string;
  fields?: Record<string, string>;
  retryAfter?: number;
  headers?: Record<string, string>;
};

function errorResponse({
  status,
  code,
  message,
  fields,
  retryAfter,
  headers,
}: ErrorInit): Response {
  const requestId = newRequestId();
  const body: ErrorBody = {
    code,
    message,
    ...(fields && { fieldErrors: fields }),
    requestId,
    ...(retryAfter !== undefined && { retryAfter }),
  };
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-request-id": requestId,
      ...headers,
    },
  });
}

export function badRequest(
  message: string,
  fields?: Record<string, string>,
): Response {
  return errorResponse({
    status: 400,
    code: ERROR_CODES.invalidInput,
    message,
    fields,
  });
}

/** 인증이 필요하거나 만료됨. 권한 부족(403)과 구분해 다음 행동을 안내 */
export function unauthorized(message = "다시 인증해 주십시오"): Response {
  return errorResponse({
    status: 401,
    code: ERROR_CODES.unauthorized,
    message,
  });
}

export function forbidden(message = "이 작업을 할 권한이 없습니다"): Response {
  return errorResponse({
    status: 403,
    code: ERROR_CODES.forbidden,
    message,
  });
}

export function notFound(message: string): Response {
  return errorResponse({
    status: 404,
    code: ERROR_CODES.notFound,
    message,
  });
}

/** 버전 충돌. 최신값을 함께 돌려줘 화면이 비교할 수 있게 함 */
export function conflict(message: string, current?: unknown): Response {
  const requestId = newRequestId();
  return Response.json(
    {
      code: ERROR_CODES.conflict,
      message,
      requestId,
      ...(current !== undefined && { current }),
    },
    {
      status: 409,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    },
  );
}

export function payloadTooLarge(
  message: string,
  fields?: Record<string, string>,
): Response {
  return errorResponse({
    status: 413,
    code: ERROR_CODES.payloadTooLarge,
    message,
    fields,
  });
}

export function unsupportedMediaType(
  message: string,
  fields?: Record<string, string>,
): Response {
  return errorResponse({
    status: 415,
    code: ERROR_CODES.unsupportedMediaType,
    message,
    fields,
  });
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return errorResponse({
    status: 429,
    code: ERROR_CODES.tooManyRequests,
    message: "잠시 후에 다시 시도해 주십시오",
    retryAfter: retryAfterSeconds,
    headers: { "retry-after": String(retryAfterSeconds) },
  });
}

/** 기능이 축소 운영 중. 사용자가 쓸 수 있는 대안을 안내함 */
export function serviceUnavailable(message: string): Response {
  return errorResponse({
    status: 503,
    code: ERROR_CODES.serviceUnavailable,
    message,
  });
}

/** 서버 오류. 원인은 로그에만 남기고 본문에는 requestId 만 담음 */
export function serverError(tag: string, error: unknown): Response {
  const requestId = newRequestId();
  console.error(`[${tag}] requestId=${requestId}`, error);
  return Response.json(
    {
      code: ERROR_CODES.serverError,
      message: "처리 중 문제가 생겼습니다. 잠시 후에 다시 시도해 주십시오",
      requestId,
    } satisfies ErrorBody,
    {
      status: 500,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    },
  );
}

export function ok<T>(body: T, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    // 제보 데이터는 캐시하지 않음. 숨김 처리가 즉시 반영돼야 함
    headers: { "cache-control": "no-store", ...init?.headers },
  });
}

/**
 * 관리 경로 응답. referrer 와 색인, 캐시를 함께 막음. POL-04
 * 관리 주소가 분석 도구와 검색엔진에 남지 않게 하는 헤더 묶음
 */
export function okPrivate<T>(body: T, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow",
      ...init?.headers,
    },
  });
}

// 경로의 id 는 사용자 입력. uuid 가 아니면 Postgres 까지 가서 드라이버가 터짐
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 경로 파라미터가 uuid 인지 확인. 형식이 틀린 것과 없는 것을 구분해 알려주지 않음 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
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
