import "server-only";

import { randomBytes } from "node:crypto";

import {
  findCandidateSightings,
  findLostByToken,
  findMatchesForLost,
  insertReportWithPhotos,
  markLostMatched,
  upsertMatchScores,
  type CandidateSighting,
} from "@rebirth/db";
import {
  LOST_TOKEN_BYTES,
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
  createLostReportChecked,
} from "@rebirth/types";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  fieldErrors,
  notFound,
  ok,
  peekRateLimit,
  serverError,
  tooManyRequests,
  type RouteContext,
} from "../http";
import { coarseGridMetersFor, snapToGrid } from "../location/geo";
import { photoObjectPath, removePhotos, uploadPhoto } from "../storage";
import { isComparable, scoreMatch, type MatchInput } from "./score";

// 실종 신고와 후보 조회
// 연락처를 저장하지 않고 조회 토큰만 발급함. 토큰을 잃으면 신고에 접근할 수 없음

const PHOTO_FIELD = "photo";
const PAYLOAD_FIELD = "payload";

// 점수가 이 아래인 후보는 보여주지 않음. 근거가 약한 후보가 목록을 채우면 판단이 흐려짐
const MIN_CANDIDATE_SCORE = 30;

function issueToken(): string {
  return randomBytes(LOST_TOKEN_BYTES).toString("base64url");
}

/* POST /api/lost  실종 신고 등록. 성공 시 조회 토큰을 한 번만 돌려줌 */

export async function createLostHandler(request: Request): Promise<Response> {
  const limitKey = clientKey(request, "createReport");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.createReport);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("사진과 신고 내용을 함께 보내야 합니다");
  }

  const photo = form.get(PHOTO_FIELD);
  if (!(photo instanceof File)) {
    return badRequest("사진을 한 장 올려 주십시오", { photo: "사진이 없습니다" });
  }
  if (photo.size > PHOTO_MAX_BYTES) {
    return badRequest("사진 용량이 너무 큽니다", {
      photo: "8MB 까지 올릴 수 있습니다. 사진을 다시 골라 주십시오",
    });
  }
  if (!PHOTO_MIME_TYPES.includes(photo.type as (typeof PHOTO_MIME_TYPES)[number])) {
    return badRequest("사진 형식을 확인해 주십시오", {
      photo: "JPG, PNG, WEBP 만 됩니다",
    });
  }

  const rawPayload = form.get(PAYLOAD_FIELD);
  if (typeof rawPayload !== "string") {
    return badRequest("신고 내용이 없습니다", {
      payload: "신고 내용을 함께 보내야 합니다",
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return badRequest("신고 내용을 읽을 수 없습니다", {
      payload: "신고 내용 형식이 올바르지 않습니다",
    });
  }

  const parsed = createLostReportChecked.safeParse(payload);
  if (!parsed.success) {
    return badRequest("입력값을 확인해 주십시오", fieldErrors(parsed.error));
  }
  const input = parsed.data;

  const gridMeters = coarseGridMetersFor({ visibleInjury: input.injury });
  const exact = input.coordinates;
  const coarse = exact ? snapToGrid(exact, gridMeters) : undefined;

  const limit = checkRateLimit(limitKey, RATE_LIMITS.createReport);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  let storagePath: string | undefined;
  try {
    const buffer = await photo.arrayBuffer();
    storagePath = photoObjectPath(crypto.randomUUID(), 0);
    await uploadPhoto({ path: storagePath, body: buffer, contentType: photo.type });

    const token = issueToken();
    const row = await insertReportWithPhotos(
      {
        kind: "lost",
        status: "open",
        // 실종 신고는 보호 상황이 성립하지 않음
        careSituation: "unknown",
        contactToken: token,
        animalType: input.animalType,
        appearance: input.appearance,
        colors: input.colors,
        size: input.size,
        sex: input.sex,
        neutered: input.neutered,
        conditionTags: [],
        collar: input.collar ?? null,
        injury: input.injury ?? null,
        earTip: input.earTip ?? null,
        exactPoint: exact ? { x: exact.lng, y: exact.lat } : null,
        coarsePoint: coarse ? { x: coarse.lng, y: coarse.lat } : null,
        coarseGridM: gridMeters,
        areaCode: input.areaCode,
        areaName: input.areaName,
        occurredAt: input.occurredAt,
        aiEditedFields: [],
      },
      [{ storagePath, sortOrder: 0 }],
    );

    // 토큰은 이 응답에서 한 번만 나감. 저장하지 않으면 다시 찾을 수 없음
    return ok({ id: row.id, token }, { status: 201 });
  } catch (error) {
    if (storagePath) await removePhotos([storagePath]).catch(() => undefined);
    return serverError("lost.create", error);
  }
}

/* GET /api/lost/[token]  내 신고와 확인할 후보 */

function toMatchInput(row: {
  animalType: MatchInput["animalType"];
  colors: string[];
  size: MatchInput["size"];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  coarsePoint: { x: number; y: number } | null;
  occurredAt: Date;
}): MatchInput {
  return {
    animalType: row.animalType,
    colors: row.colors,
    size: row.size,
    collar: row.collar,
    injury: row.injury,
    earTip: row.earTip,
    // 격자 좌표로만 계산함. 정확 좌표는 읽지 않음
    point: row.coarsePoint
      ? { lat: row.coarsePoint.y, lng: row.coarsePoint.x }
      : null,
    occurredAt: row.occurredAt,
  };
}

export async function getLostHandler(
  _request: Request,
  context: RouteContext<{ token: string }>,
): Promise<Response> {
  const { token } = await context.params;

  try {
    const lost = await findLostByToken(token);
    if (!lost) {
      return notFound("조회 주소가 맞지 않습니다. 받은 링크를 다시 확인해 주십시오");
    }

    const lostInput = toMatchInput({
      animalType: lost.animalType,
      colors: lost.colors,
      size: lost.size,
      collar: lost.collar,
      injury: lost.injury,
      earTip: lost.earTip,
      coarsePoint: lost.coarsePoint,
      occurredAt: lost.occurredAt,
    });

    const candidates = await findCandidateSightings({
      lostId: lost.id,
      animalType: lost.animalType,
      point: lostInput.point,
      occurredAt: lost.occurredAt,
    });

    const scored = candidates
      .map((candidate: CandidateSighting) => {
        const input = toMatchInput(candidate);
        if (!isComparable(lostInput, input)) return null;
        const result = scoreMatch(lostInput, input);
        if (result.score < MIN_CANDIDATE_SCORE) return null;
        return { candidate, result };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.result.score - a.result.score);

    // 계산 결과를 캐시해 운영 화면과 다음 조회가 같은 점수를 봄
    if (scored.length > 0) {
      await upsertMatchScores(
        scored.map(({ candidate, result }) => ({
          lostId: lost.id,
          sightingId: candidate.id,
          score: result.score,
          breakdown: result.breakdown,
        })),
      ).catch((error) => {
        // 캐시 실패가 화면을 막지 않음
        console.error("[lost.matches] 점수 캐시 실패", error);
      });
      await markLostMatched(lost.id).catch(() => undefined);
    }

    return ok({
      lost: {
        id: lost.id,
        animalType: lost.animalType,
        appearance: lost.appearance,
        colors: lost.colors,
        size: lost.size,
        areaName: lost.areaName,
        occurredAt: lost.occurredAt,
        status: lost.status,
      },
      // 유사도이며 개체 동일성 확정이 아님. 화면이 이 문구를 항상 함께 렌더함
      candidates: scored.map(({ candidate, result }) => ({
        id: candidate.id,
        score: result.score,
        breakdown: result.breakdown,
        appearance: candidate.appearance,
        colors: candidate.colors,
        size: candidate.size,
        careSituation: candidate.careSituation,
        conditionTags: candidate.conditionTags,
        areaName: candidate.areaName,
        occurredAt: candidate.occurredAt,
      })),
    });
  } catch (error) {
    return serverError("lost.matches", error);
  }
}

/* GET /api/lost/[token]/matches  캐시된 후보만 읽음. 운영 화면과 재조회용 */

export async function getLostMatchesHandler(
  _request: Request,
  context: RouteContext<{ token: string }>,
): Promise<Response> {
  const { token } = await context.params;

  try {
    const lost = await findLostByToken(token);
    if (!lost) {
      return notFound("조회 주소가 맞지 않습니다. 받은 링크를 다시 확인해 주십시오");
    }
    const items = await findMatchesForLost(lost.id);
    return ok({ items });
  } catch (error) {
    return serverError("lost.matches.cached", error);
  }
}
