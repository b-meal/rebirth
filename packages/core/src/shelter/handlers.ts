import { logFailure } from "../http/log";
import "server-only";

import {
  countShelters,
  findNearbyShelters,
  listAnimalKinds,
  listSheltersByRegion,
  listSidoRegions,
} from "@rebirth/db";
import { shelterKind } from "@rebirth/types";
import { z } from "zod";

import { requireAdmin } from "../reports/admin-handlers";
import { badRequest, fieldErrors, ok, serverError, serviceUnavailable } from "../http";
import { isInKorea } from "../location/geo";
import { ShelterSyncError, syncAllShelters } from "./sync";

// 보호·구조 기관 안내. 공공데이터 사본이라 인증 없이 읽게 둠
// 쓰기는 공공데이터 한도를 태우므로 운영 토큰을 요구함

// 이어 읽을 자리. 기관 목록은 거의 바뀌지 않아 건너뛴 수로 셈
const offset = z.coerce.number().int().min(0).max(10_000).default(0);

const nearbyQuery = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  kind: shelterKind.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(3),
  offset,
});

// 좌표가 없으면 지역 이름으로 찾음. 시도 이름은 표준 코드에서 온 값만 받음
const regionQuery = z.object({
  region: z.string().min(2).max(20).optional(),
  kind: shelterKind.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
  offset,
});

export async function nearbySheltersHandler(request: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(request.url).searchParams);

  // 좌표가 없으면 지역 목록으로 떨어뜨림. 위치 권한을 거부해도 화면이 비지 않음
  if (params.lat === undefined && params.lng === undefined) {
    const byRegion = regionQuery.safeParse(params);
    if (!byRegion.success) {
      return badRequest("조회 조건이 올바르지 않습니다", fieldErrors(byRegion.error));
    }
    try {
      // 한 건 더 받아 다음 쪽이 있는지 봄. 총 건수 질의를 피함
      const { limit } = byRegion.data;
      const rows = await listSheltersByRegion({ ...byRegion.data, limit: limit + 1 });
      return ok({ items: rows.slice(0, limit), hasMore: rows.length > limit });
    } catch (error) {
      return serverError("shelters", error);
    }
  }

  const parsed = nearbyQuery.safeParse(params);
  if (!parsed.success) {
    return badRequest("좌표가 올바르지 않습니다", fieldErrors(parsed.error));
  }

  const { lat, lng, kind, limit, offset: skip } = parsed.data;
  if (!isInKorea({ lat, lng })) {
    return badRequest("국내 좌표만 조회할 수 있습니다", {
      lat: "국내 범위를 벗어났습니다",
    });
  }

  try {
    // 한 건 더 받아 다음 쪽이 있는지 봄. 총 건수 질의를 피함
    const rows = await findNearbyShelters({
      point: { lat, lng },
      kind,
      limit: limit + 1,
      offset: skip,
    });
    return ok({ items: rows.slice(0, limit), hasMore: rows.length > limit });
  } catch (error) {
    return serverError("shelters", error);
  }
}

export async function syncSheltersHandler(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const results = await syncAllShelters();
    return ok({ results, counts: await countShelters() });
  } catch (error) {
    if (error instanceof ShelterSyncError) {
      logFailure("shelters.sync", error.message, { reason: error.reason });
      return serviceUnavailable(error.message);
    }
    return serverError("shelters-sync", error);
  }
}

const kindQuery = z.object({
  q: z.string().min(1).max(30).optional(),
  upKindCd: z.string().max(10).optional(),
});

/** 표준 품종 제안. 품종을 단정하지 않으므로 고르지 않아도 넘어갈 수 있음 */
export async function animalKindsHandler(request: Request): Promise<Response> {
  const parsed = kindQuery.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return badRequest("조회 조건이 올바르지 않습니다", fieldErrors(parsed.error));
  }

  try {
    const rows = await listAnimalKinds(parsed.data.upKindCd);
    const needle = parsed.data.q?.replace(/\s/g, "").toLowerCase();
    const items = needle
      ? rows.filter((row) => row.kindNm.replace(/\s/g, "").toLowerCase().includes(needle))
      : rows;
    return ok({ items: items.slice(0, 20) });
  } catch (error) {
    return serverError("kinds", error);
  }
}

/** 시도 목록. 지역 고르개의 값이 표준 코드에서 오게 함 */
export async function sidoRegionsHandler(): Promise<Response> {
  try {
    return ok({ items: await listSidoRegions() });
  } catch (error) {
    return serverError("regions", error);
  }
}
