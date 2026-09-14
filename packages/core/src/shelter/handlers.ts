import "server-only";

import { countShelters, findNearbyShelters } from "@rebirth/db";
import { shelterKind } from "@rebirth/types";
import { z } from "zod";

import { requireAdmin } from "../reports/admin-handlers";
import { badRequest, fieldErrors, ok, serverError, serviceUnavailable } from "../http";
import { isInKorea } from "../location/geo";
import { ShelterSyncError, syncAllShelters } from "./sync";

// 보호·구조 기관 안내. 공공데이터 사본이라 인증 없이 읽게 둠
// 쓰기는 공공데이터 한도를 태우므로 운영 토큰을 요구함

const nearbyQuery = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  kind: shelterKind.optional(),
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

export async function nearbySheltersHandler(request: Request): Promise<Response> {
  const parsed = nearbyQuery.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return badRequest("좌표가 올바르지 않습니다", fieldErrors(parsed.error));
  }

  const { lat, lng, kind, limit } = parsed.data;
  if (!isInKorea({ lat, lng })) {
    return badRequest("국내 좌표만 조회할 수 있습니다", {
      lat: "국내 범위를 벗어났습니다",
    });
  }

  try {
    const items = await findNearbyShelters({ point: { lat, lng }, kind, limit });
    return ok({ items });
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
      console.error(`[shelters] 동기화 중단 (${error.reason})`, error.message);
      return serviceUnavailable(error.message);
    }
    return serverError("shelters-sync", error);
  }
}
