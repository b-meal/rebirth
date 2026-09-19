import "server-only";

import { createHash } from "node:crypto";

import { recordErrorEvent } from "@rebirth/db";

// 로그를 DB 에도 남기는 쪽. log.ts 가 필요할 때만 늦게 불러옴
//
// Vercel 무료 플랜의 런타임 로그는 한 시간만 남아, 아침에 난 고장을 점심에는 볼 수 없음
// 종류별로 한 행에 모아 세므로 같은 오류가 쏟아져도 표가 커지지 않음
//
// 여기서 나는 실패는 다시 logFailure 로 보내지 않음. 오류 위에 오류가 겹쳐 되돌기만 함

/** 저장 전에 자르는 길이. 메시지는 한 줄로 읽을 만큼, 스택은 첫 몇 프레임만 */
const MAX_MESSAGE = 500;
const MAX_STACK = 2000;

/**
 * 메시지에 섞여 오는 값 중 남기면 안 되는 것
 * 키와 토큰은 저장소가 공개라 절대 들어가면 안 되고, 좌표는 발견 동물과 제보자를 가리킴
 */
const SECRETS: [RegExp, string][] = [
  // sk-ant-, sb_secret_, eyJ 로 시작하는 JWT 같은 것
  [/\b(?:sk|pk|rk|sb)[-_][A-Za-z0-9_-]{8,}/g, "[key]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[hash]"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  // 위도 경도 짝. 소수점 네 자리를 넘는 수가 붙어 오면 좌표로 봄
  [/-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/g, "[point]"],
  [/postgres(?:ql)?:\/\/[^\s"']+/g, "[dsn]"],
];

function scrub(value: string): string {
  let out = value;
  for (const [pattern, mask] of SECRETS) out = out.replace(pattern, mask);
  return out;
}

/**
 * 같은 종류를 한 행에 모으려고 값이 다른 부분을 지움
 * `제보 a1b2 를 찾지 못함` 과 `제보 c3d4 를 찾지 못함` 이 한 줄로 모임
 */
function normalize(value: string): string {
  return (
    value
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
      // 짧은 16진수 토막도 식별자로 봄. 숫자를 하나도 안 낀 것은 낱말일 수 있어 제외
      .replace(/\b(?=[a-f0-9]*\d)[a-f0-9]{6,}\b/gi, "<id>")
      .replace(/\d+/g, "<n>")
      .replace(/\s+/g, " ")
      .slice(0, MAX_MESSAGE)
      .trim()
  );
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    // 화면에서 올라온 것은 이미 `TypeError: ...` 꼴이라 이름을 다시 붙이지 않음
    const named = /^[A-Za-z]*Error: /.test(error.message);
    return {
      message: named ? error.message : `${error.name}: ${error.message}`,
      stack: error.stack?.slice(0, MAX_STACK),
    };
  }
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error).slice(0, MAX_MESSAGE) };
  } catch {
    return { message: String(error) };
  }
}

/**
 * 같은 종류를 이 간격 안에서는 한 번만 씀
 *
 * 스토리지가 통째로 막히면 한 화면에서 수백 번 같은 실패가 나는데
 * 그때마다 DB 를 건드리면 고장 위에 쓰기 부하를 얹음
 * 그동안의 횟수는 세어 두었다가 다음 쓰기에 얹음
 * 마지막 창에서 더 나지 않고 끝난 몫은 올라가지 않아 count 는 실제보다 작을 수 있음
 * 무엇이 고장 났는지 보는 값이라 이 오차는 감수함
 *
 * 인스턴스마다 따로 세는 한계는 레이트리밋과 같음
 */
const THROTTLE_MS = 10_000;

const pending = new Map<string, { at: number; count: number }>();

/**
 * 로컬과 Preview 와 Production 이 모두 같은 DB 에 씀
 * 이 값을 남기지 않으면 오류 화면에서 내 노트북에서 난 것과 사용자에게서 난 것이 같아 보임
 * Vercel 이 아닌 곳에는 VERCEL_ENV 가 없음
 */
function environment(): string {
  return process.env.VERCEL_ENV ?? "local";
}

export async function recordError(
  level: "failure" | "notice",
  tag: string,
  error: unknown,
  context?: Record<string, string | number>,
): Promise<void> {
  const described = describe(error);
  const message = scrub(described.message).slice(0, MAX_MESSAGE);
  const stack = described.stack ? scrub(described.stack).slice(0, MAX_STACK) : null;

  // env 를 함께 넣어 로컬에서 난 것이 배포 행의 count 를 올리지 않게 함
  // 섞이면 칸에는 마지막에 쓴 쪽만 남아 값이 거짓말을 함
  const env = environment();
  const fingerprint = createHash("sha256")
    .update(`${level}|${env}|${tag}|${normalize(message)}`)
    .digest("hex")
    .slice(0, 32);

  const now = Date.now();
  const held = pending.get(fingerprint);
  if (held && now - held.at < THROTTLE_MS) {
    held.count += 1;
    return;
  }

  // 참았던 만큼을 이번 쓰기에 얹음
  const occurrences = 1 + (held?.count ?? 0);
  pending.set(fingerprint, { at: now, count: 0 });

  await recordErrorEvent({
    fingerprint,
    level,
    env,
    tag,
    message,
    stack,
    context,
    occurrences,
  });
}
