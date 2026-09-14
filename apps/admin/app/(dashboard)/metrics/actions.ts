"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, isAdminCookieValid } from "@rebirth/core/admin";
import {
  RescueDataError,
  collectRescueStats,
  fetchKinds,
  fetchRegions,
} from "@rebirth/core/shelter";
import { upsertAnimalKinds, upsertGovRegions, upsertRescueStats } from "@rebirth/db";

// 서버 액션은 proxy 를 거치지 않으므로 여기서 쿠키를 다시 봄
// 공고 전량이 7천여 건이라 한 번에 70여 회를 부름. 1분 남짓 걸림

export type SyncResult = { ok: boolean; message?: string };

export async function syncGovData(
  _prev: SyncResult,
  _form: FormData,
): Promise<SyncResult> {
  const jar = await cookies();
  if (!isAdminCookieValid(jar.get(ADMIN_COOKIE)?.value)) {
    return { ok: false, message: "다시 로그인해 주십시오" };
  }

  try {
    const kinds = await fetchKinds();
    await upsertAnimalKinds(kinds);

    const regions = await fetchRegions();
    await upsertGovRegions(regions);

    const stats = await collectRescueStats(regions);
    const collectedOn = new Date().toISOString().slice(0, 10);
    await upsertRescueStats(stats.rows.map((row) => ({ ...row, collectedOn })));

    revalidatePath("/metrics");
    return {
      ok: true,
      message: `품종 ${kinds.length}, 지역 ${regions.length}, 공고 ${stats.fetched}`,
    };
  } catch (error) {
    if (error instanceof RescueDataError) {
      console.error(`[rescue] 수집 중단 (${error.reason})`, error.message);
      return { ok: false, message: error.message };
    }
    console.error("[rescue] 수집 실패", error);
    return { ok: false, message: "처리 중 문제가 생겼습니다" };
  }
}
