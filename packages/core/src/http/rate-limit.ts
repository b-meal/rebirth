// 인메모리 고정 창 레이트리밋. 무가입 공개 제보라 스팸 한 번에 데모가 끝나는 것을 막음
// server-only 를 import 하지 않음. 서버 자원을 잡지 않아 단위 테스트에서 그대로 돎
// 서버리스 인스턴스마다 창이 따로 도는 한계가 있어 상한을 넉넉히 잡지 않음
// P1 에서 Upstash 같은 공유 저장소로 옮김

type Window = { count: number; resetAt: number };

declare global {
  var __rebirthRateLimit: Map<string, Window> | undefined;
}

const buckets = (globalThis.__rebirthRateLimit ??= new Map());

// 창이 지난 항목이 계속 쌓이지 않게 호출마다 조금씩 정리
const SWEEP_EVERY = 200;
let calls = 0;

function sweep(now: number) {
  if (++calls % SWEEP_EVERY !== 0) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitRule = { limit: number; windowSeconds: number };

// e2e 는 한 흐름에서 여러 건을 만들어 기본 상한에 바로 걸림
// 로컬과 CI 에서만 켜고 배포 환경에는 넣지 않음
const RELAXED = process.env.RATE_LIMIT_RELAXED === "true";

// POL-28 의 시작값. 생성 3회/분·분석 5회/분 을 기준으로 두고
// 창을 넓게 잡아 NAT 공유 사용자가 한 번에 잠기지 않게 함
// 정확한 차단 규칙은 응답에 노출하지 않음
export const RATE_LIMITS = {
  createReport: { limit: RELAXED ? 200 : 9, windowSeconds: 180 },
  createFlag: { limit: RELAXED ? 200 : 5, windowSeconds: 600 },
  analyze: { limit: RELAXED ? 200 : 15, windowSeconds: 180 },
  signPhoto: { limit: RELAXED ? 600 : 60, windowSeconds: 60 },
  upload: { limit: RELAXED ? 400 : 20, windowSeconds: 180 },
  // 관리 토큰 교환. 토큰 추측 시도를 억제함
  manageExchange: { limit: RELAXED ? 200 : 10, windowSeconds: 600 },
  // 문의 접수. 남용을 막되 권리 요청 경로를 잠그지 않을 정도로 둠
  support: { limit: RELAXED ? 200 : 5, windowSeconds: 600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  rule: RateLimitRule,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return { allowed: true, remaining: rule.limit - 1 };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: rule.limit - existing.count };
}

/**
 * 창을 소모하지 않고 상태만 봄
 * 검증 실패로 되돌려보내는 요청이 상한을 깎지 않게 할 때 씀
 */
export function peekRateLimit(
  key: string,
  rule: RateLimitRule,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    return { allowed: true, remaining: rule.limit };
  }
  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: rule.limit - existing.count };
}

/**
 * 요청자 식별용 키. 프록시 뒤라 x-forwarded-for 의 첫 값을 씀
 * IP 를 저장하지 않고 창이 지나면 사라지는 메모리에만 둠
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}
