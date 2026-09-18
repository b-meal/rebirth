import { logFailure } from "../http/log";
import "server-only";

import { badRequest, okPrivate, serverError, unauthorized } from "../http";
import { clearCookie, sessionCookie } from "../http/tokens";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  adminCookieValue,
  adminSecret,
  isAdminPasswordValid,
} from "./session";

// 운영 대시보드 로그인. 실패 사유를 구분해 주지 않아 비밀번호 유무를 떠보지 못하게 함

export async function adminLoginHandler(request: Request): Promise<Response> {
  const secret = adminSecret();
  if (!secret) {
    logFailure("admin.login", "ADMIN_API_TOKEN 이 없어 로그인을 받지 않음");
    return unauthorized("운영 대시보드가 설정되지 않았습니다");
  }

  let password = "";
  try {
    const form = await request.formData();
    password = String(form.get("password") ?? "");
  } catch {
    return badRequest("입력을 읽지 못했습니다");
  }

  if (!isAdminPasswordValid(password)) {
    return unauthorized("비밀번호가 맞지 않습니다");
  }

  try {
    return okPrivate(
      { ok: true },
      {
        headers: {
          "set-cookie": sessionCookie(ADMIN_COOKIE, adminCookieValue(secret), {
            maxAgeSeconds: ADMIN_SESSION_MAX_AGE,
          }),
        },
      },
    );
  } catch (error) {
    return serverError("admin-login", error);
  }
}

export async function adminLogoutHandler(): Promise<Response> {
  return okPrivate({ ok: true }, { headers: { "set-cookie": clearCookie(ADMIN_COOKIE) } });
}
