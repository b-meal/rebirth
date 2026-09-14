"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, isAdminCookieValid } from "@rebirth/core/admin";
import { ReviewError, runMatchReview } from "@rebirth/core/matching";

// 서버 액션은 proxy 를 거치지 않으므로 여기서 쿠키를 다시 봄
// 한 번에 한 쌍만 돌림. 모델 호출 비용이 후보 수만큼 그대로 늘어남

export type ReviewActionResult = { ok: boolean; message?: string };

export async function reviewPair(
  _prev: ReviewActionResult,
  form: FormData,
): Promise<ReviewActionResult> {
  const jar = await cookies();
  if (!isAdminCookieValid(jar.get(ADMIN_COOKIE)?.value)) {
    return { ok: false, message: "다시 로그인해 주십시오" };
  }

  const lostId = String(form.get("lostId") ?? "");
  const sightingId = String(form.get("sightingId") ?? "");
  if (!lostId || !sightingId) {
    return { ok: false, message: "후보를 고르지 못했습니다" };
  }

  try {
    const outcome = await runMatchReview({ lostId, sightingId });
    revalidatePath("/ai");
    return { ok: true, message: `${outcome.model} · ${outcome.latencyMs}ms` };
  } catch (error) {
    if (error instanceof ReviewError) {
      console.error(`[ai] 재평가 중단 (${error.kind})`, error.message);
      return { ok: false, message: error.message };
    }
    console.error("[ai] 재평가 실패", error);
    return { ok: false, message: "처리 중 문제가 생겼습니다" };
  }
}
