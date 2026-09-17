import "server-only";

import { insertDraftLocation } from "@rebirth/db";
import { LOCATION_ACCURACY_LIMIT_M, resolveLocation } from "@rebirth/types";
import type { ResolvedLocation } from "@rebirth/types";

import {
  badRequest,
  ensureDraftSession,
  okPrivate,
  parseJson,
  serverError,
} from "../http";
import { isInKorea } from "../location/geo";

// POST /api/draft/location/resolve  좌표를 서버에 두고 참조만 돌려줌
// 응답에 좌표가 없어 브라우저와 sessionStorage 에 정확 위치가 남지 않음. POL-08

/** 이 오차보다 큰 GPS 는 거리 점수 근거가 못 됨. 저장은 하고 표시만 정보 부족 */
function usableForDistance(input: {
  source: "gps" | "place" | "manual_area";
  accuracyM?: number;
}): boolean {
  if (input.source === "manual_area") return false;
  if (input.source === "place") return true;
  return (input.accuracyM ?? Number.POSITIVE_INFINITY) <= LOCATION_ACCURACY_LIMIT_M;
}

export async function resolveLocationHandler(
  request: Request,
): Promise<Response> {
  const parsed = await parseJson(request, resolveLocation);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  // 국내 범위 재확인. zod 범위와 카카오 서비스 범위가 달라 두 번 거름
  if (input.source !== "manual_area" && !isInKorea(input)) {
    return badRequest("국내에서 목격한 위치만 등록할 수 있습니다", {
      lat: "서비스 범위를 벗어난 좌표입니다",
    });
  }

  try {
    const session = await ensureDraftSession(request);
    const row = await insertDraftLocation({
      sessionId: session.sessionId,
      source: input.source,
      // numeric 열이 아니라 text 로 두어 부동소수 왜곡 없이 그대로 보관
      lat: input.source === "manual_area" ? null : String(input.lat),
      lng: input.source === "manual_area" ? null : String(input.lng),
      accuracyM: input.source === "gps" ? (input.accuracyM ?? null) : null,
      areaCodeSystem: input.areaCodeSystem ?? null,
      areaCode: input.areaCode ?? null,
      areaName: input.areaName,
      areaCodeVersion: input.areaCodeVersion ?? null,
    });

    const body: ResolvedLocation = {
      locationToken: row.id,
      source: input.source,
      areaName: input.areaName,
      usableForDistance: usableForDistance({
        source: input.source,
        accuracyM: input.source === "gps" ? input.accuracyM : undefined,
      }),
      expiresAt: row.expiresAt.toISOString(),
    };

    return okPrivate(body, {
      status: 201,
      ...(session.setCookie && { headers: { "set-cookie": session.setCookie } }),
    });
  } catch (error) {
    return serverError("draft.location.resolve", error);
  }
}
