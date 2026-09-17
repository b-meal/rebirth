import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// 토큰 발급과 해시. 원문은 발급 응답에서 한 번만 나가고 DB 에는 해시만 둠
// server-only 를 import 하지 않음. 순수 함수라 단위 테스트에서 그대로 돎

/** 관리 토큰 길이. POL-03 의 충분한 난수 */
export const MANAGE_TOKEN_BYTES = 32;
/** 초안 세션과 문의 조회 토큰 */
export const SESSION_TOKEN_BYTES = 32;

export function issueToken(bytes = MANAGE_TOKEN_BYTES): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * 저장용 해시. 토큰은 충분한 난수라 사전 공격이 성립하지 않아 salt 를 두지 않음
 * salt 를 두면 조회 시 전체를 훑어야 해 유일 인덱스를 쓸 수 없음
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 길이가 다르면 timingSafeEqual 이 던지므로 먼저 걸러냄 */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** 사람이 읽고 옮겨 적는 접수번호. 혼동되는 글자를 뺀 문자셋 */
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function issueReference(prefix: string, length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) {
    out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `${prefix}-${out}`;
}

/* 쿠키 */

export const DRAFT_COOKIE = "rebirth_draft";
export const MANAGE_COOKIE = "rebirth_manage";

/** 요청 쿠키에서 값을 읽음. next 의 cookies() 를 쓰지 않아 이 패키지가 묶이지 않음 */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

type CookieOptions = {
  maxAgeSeconds: number;
  /** 관리 세션은 하위 경로 전체에서 쓰이므로 기본은 / */
  path?: string;
};

/**
 * HttpOnly 세션 쿠키. POL-03
 * Secure 는 배포에서만 켬. 로컬 http 개발에서 쿠키가 버려지는 것을 막음
 */
export function sessionCookie(
  name: string,
  value: string,
  { maxAgeSeconds, path = "/" }: CookieOptions,
): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
    secure,
  ].join("; ");
}

export function clearCookie(name: string, path = "/"): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax`;
}
