import "server-only";

import {
  govDataSummary,
  upsertAnimalKinds,
  upsertGovRegions,
  upsertRescueStats,
} from "@rebirth/db";

import { requireAdmin } from "../reports/admin-handlers";
import { okPrivate, serverError, serviceUnavailable } from "../http";
import {
  RescueDataError,
  collectRescueStats,
  fetchKinds,
  fetchRegions,
} from "./rescue-data";

// 코드와 집계를 한 번에 받아 오는 운영 라우트
// 공고 전량이 7천여 건이라 한 번에 70여 회를 부름. 하루 1만 건 한도 안에 들어감

export async function syncRescueDataHandler(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const kinds = await fetchKinds();
    const savedKinds = await upsertAnimalKinds(kinds);

    const regions = await fetchRegions();
    const savedRegions = await upsertGovRegions(regions);

    const stats = await collectRescueStats(regions);
    // 수집한 날짜로 묶음. 같은 날 다시 돌리면 그 날 줄을 덮어씀
    const collectedOn = new Date().toISOString().slice(0, 10);
    const savedStats = await upsertRescueStats(
      stats.rows.map((row) => ({ ...row, collectedOn })),
    );

    return okPrivate({
      kinds: { fetched: kinds.length, saved: savedKinds.length },
      regions: {
        fetched: regions.length,
        saved: savedRegions.length,
        sido: regions.filter((row) => row.parentCd === null).length,
      },
      stats: {
        reported: stats.reported,
        fetched: stats.fetched,
        buckets: savedStats.length,
        collectedOn,
      },
      summary: await govDataSummary(),
    });
  } catch (error) {
    if (error instanceof RescueDataError) {
      console.error(`[rescue] 수집 중단 (${error.reason})`, error.message);
      return serviceUnavailable(error.message);
    }
    return serverError("rescue-sync", error);
  }
}
