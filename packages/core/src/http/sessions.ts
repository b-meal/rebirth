import "server-only";

import {
  DRAFT_TTL_HOURS,
  MANAGE_SESSION_IDLE_DAYS,
  hasManageAccess,
  insertDraftSession,
  insertManageSession,
  touchDraftSession,
  touchManageSession,
} from "@rebirth/db";

import {
  DRAFT_COOKIE,
  MANAGE_COOKIE,
  hashToken,
  issueToken,
  readCookie,
  sessionCookie,
} from "./tokens";

// 세션 확보와 권한 확인. 라우트 핸들러가 이 두 함수만 쓰면 경계가 지켜짐

export const DRAFT_COOKIE_MAX_AGE = DRAFT_TTL_HOURS * 3600;
export const MANAGE_COOKIE_MAX_AGE = MANAGE_SESSION_IDLE_DAYS * 24 * 3600;

export type SessionResult = {
  sessionId: string;
  /** 새로 발급했으면 응답에 실을 Set-Cookie. 기존 세션이면 undefined */
  setCookie?: string;
};

/**
 * 초안 세션을 확보함. 쿠키가 없거나 만료됐으면 새로 발급
 * 사진·위치·AI 작업이 모두 이 세션에 묶여 남의 자료를 붙일 수 없게 됨. POL-49
 */
export async function ensureDraftSession(
  request: Request,
): Promise<SessionResult> {
  const existing = readCookie(request, DRAFT_COOKIE);
  if (existing) {
    const row = await touchDraftSession(hashToken(existing));
    if (row) return { sessionId: row.id };
  }

  const token = issueToken();
  const row = await insertDraftSession(hashToken(token));
  return {
    sessionId: row.id,
    setCookie: sessionCookie(DRAFT_COOKIE, token, {
      maxAgeSeconds: DRAFT_COOKIE_MAX_AGE,
    }),
  };
}

/** 이미 있는 초안 세션만 찾음. 없으면 만들지 않아 조회가 세션을 늘리지 않음 */
export async function findDraftSession(
  request: Request,
): Promise<string | undefined> {
  const existing = readCookie(request, DRAFT_COOKIE);
  if (!existing) return undefined;
  const row = await touchDraftSession(hashToken(existing));
  return row?.id;
}

/** 관리 세션을 새로 만들고 쿠키를 발급함. 토큰 교환 경로에서만 호출 */
export async function createManageSession(): Promise<Required<SessionResult>> {
  const token = issueToken();
  const row = await insertManageSession(hashToken(token));
  return {
    sessionId: row.id,
    setCookie: sessionCookie(MANAGE_COOKIE, token, {
      maxAgeSeconds: MANAGE_COOKIE_MAX_AGE,
    }),
  };
}

/** 현재 관리 세션. 만료·회수된 세션은 없는 것으로 취급 */
export async function findManageSession(
  request: Request,
): Promise<string | undefined> {
  const existing = readCookie(request, MANAGE_COOKIE);
  if (!existing) return undefined;
  const row = await touchManageSession(hashToken(existing));
  return row?.id;
}

export type AccessCheck =
  | { ok: true; sessionId: string }
  | { ok: false; reason: "no_session" | "no_grant" };

/**
 * 이 요청이 그 기록을 관리할 수 있는지 확인
 * 세션 만료(재인증 필요)와 권한 부족을 구분해 돌려줌. WEB-27
 */
export async function checkManageAccess(
  request: Request,
  reportId: string,
): Promise<AccessCheck> {
  const sessionId = await findManageSession(request);
  if (!sessionId) return { ok: false, reason: "no_session" };

  const granted = await hasManageAccess({ sessionId, reportId });
  if (!granted) return { ok: false, reason: "no_grant" };

  return { ok: true, sessionId };
}
