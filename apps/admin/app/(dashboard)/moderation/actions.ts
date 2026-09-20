"use server";

import { logFailure } from "@rebirth/core/http";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, isAdminCookieValid } from "@rebirth/core/admin";
import { resolveFlags } from "@rebirth/db";

// 서버 액션은 proxy 를 거치지 않으므로 여기서 쿠키를 다시 봄

export type ModerationResult = { ok: boolean; message?: string };

export async function decideFlag(
  _prev: ModerationResult,
  form: FormData,
): Promise<ModerationResult> {
  const jar = await cookies();
  if (!isAdminCookieValid(jar.get(ADMIN_COOKIE)?.value)) {
    return { ok: false, message: "다시 로그인해 주십시오" };
  }

  const reportId = String(form.get("reportId") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!reportId || (decision !== "hide" && decision !== "keep")) {
    return { ok: false, message: "판정값이 올바르지 않습니다" };
  }

  try {
    const row = await resolveFlags({ reportId, decision });
    if (!row) return { ok: false, message: "제보를 찾지 못했습니다" };
    revalidatePath("/moderation");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    logFailure("moderation.decide", error);
    return { ok: false, message: "처리 중 문제가 생겼습니다" };
  }
}
