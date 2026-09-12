import "server-only";

import {
  attachIdempotencyResult,
  claimIdempotencyKey,
  findCandidateSightings,
  findIdempotencyKey,
  findLostForScoring,
  findManagedReport,
  findMatchesForLost,
  releaseIdempotencyKey,
  upsertMatchScores,
  type CandidateSighting,
} from "@rebirth/db";
import { createLostReport } from "@rebirth/types";

import {
  RATE_LIMITS,
  checkManageAccess,
  clientKey,
  ensureDraftSession,
  forbidden,
  isUuid,
  notFound,
  okPrivate,
  parseJson,
  peekRateLimit,
  serverError,
  tooManyRequests,
  unauthorized,
  type RouteContext,
} from "../http";
import { saveReport } from "../reports/handlers";
import { isComparable, scoreMatch, type MatchInput } from "./score";

// 실종 신고와 확인할 후보
// 연락처를 저장하지 않고 관리 주소만 발급함. 주소를 잃으면 문의 경로로만 복구됨

// 점수가 이 아래인 후보는 보여주지 않음. 근거가 약한 후보가 목록을 채우면 판단이 흐려짐
const MIN_CANDIDATE_SCORE = 30;

const NOT_FOUND = "찾는 신고가 없습니다. 관리 주소를 다시 확인해 주십시오";
const NEED_AUTH = "관리 주소로 다시 들어와 주십시오";

/* POST /api/lost  실종 신고 등록. 성공 시 관리 주소를 한 번만 돌려줌 */

export async function createLostHandler(
  request: Request,
  options: { reporterId?: string } = {},
): Promise<Response> {
  const limitKey = clientKey(request, "createReport");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.createReport);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  const parsed = await parseJson(request, createLostReport);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  const session = await ensureDraftSession(request);

  try {
    const claimed = await claimIdempotencyKey({
      key: input.idempotencyKey,
      sessionId: session.sessionId,
    });
    if (!claimed) {
      const prior = await findIdempotencyKey({
        key: input.idempotencyKey,
        sessionId: session.sessionId,
      });
      if (prior?.reportId) {
        return okPrivate({ id: prior.reportId, duplicate: true });
      }
      return okPrivate({ pending: true }, { status: 202 });
    }

    const saved = await saveReport({
      // 실종 신고에는 보호 상황·상태 태그·AI 초안 단계가 없음
      input: {
        ...input,
        kind: "lost",
        careSituation: "unknown",
        conditionTags: [],
        aiEditedFields: [],
      },
      sessionId: session.sessionId,
      kind: "lost",
      careSituation: "unknown",
      conditionTags: [],
      reporterId: options.reporterId,
    });
    if ("error" in saved) {
      await releaseIdempotencyKey(input.idempotencyKey);
      return saved.error;
    }

    await attachIdempotencyResult({
      key: input.idempotencyKey,
      reportId: saved.id,
    });

    return okPrivate(
      {
        id: saved.id,
        lifecycle: saved.lifecycle,
        version: saved.version,
        // 관리 주소는 이 응답에서 한 번만 나감
        manageToken: saved.manageToken,
      },
      {
        status: 201,
        headers: {
          "set-cookie": [session.setCookie, saved.manageCookie]
            .filter(Boolean)
            .join(", "),
        },
      },
    );
  } catch (error) {
    await releaseIdempotencyKey(input.idempotencyKey).catch(() => undefined);
    return serverError("lost.create", error);
  }
}

/* GET /api/lost/[id]/candidates  내 신고와 확인할 후보 */

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

type LostRow = NonNullable<Awaited<ReturnType<typeof findManagedReport>>>;

/** 관리 권한을 확인하고 실종 신고를 읽음. 후보 목록은 작성자만 봄 */
async function loadOwnLost(
  request: Request,
  id: string,
): Promise<{ error: Response } | { lost: LostRow }> {
  if (!isUuid(id)) return { error: notFound(NOT_FOUND) };

  const access = await checkManageAccess(request, id);
  if (!access.ok) {
    // 세션 만료와 권한 부족을 구분해 다음 행동을 안내함. WEB-27
    return {
      error:
        access.reason === "no_session"
          ? unauthorized(NEED_AUTH)
          : forbidden("이 신고를 관리할 권한이 없습니다"),
    };
  }

  const lost = await findManagedReport(id);
  if (!lost || lost.kind !== "lost") return { error: notFound(NOT_FOUND) };
  return { lost };
}

export async function getLostCandidatesHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  try {
    const loaded = await loadOwnLost(request, id);
    if ("error" in loaded) return loaded.error;
    const { lost } = loaded;

    // 격자 좌표는 점수 계산에만 씀. 이 값은 응답에 담지 않음
    const [scoring] = await findLostForScoring(lost.id);
    if (!scoring) return notFound(NOT_FOUND);
    const lostInput = toMatchInput(scoring);

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
        console.error("[lost.candidates] 점수 캐시 실패", error);
      });
    }

    return okPrivate({
      lost: {
        id: lost.id,
        animalType: lost.animalType,
        appearance: lost.appearance,
        colors: lost.colors,
        size: lost.size,
        areaName: lost.areaName,
        occurredAt: lost.occurredAt,
        lifecycle: lost.lifecycle,
        version: lost.version,
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
        // 거리 근거가 없는 후보는 화면이 정보 부족으로 표시함
        locationSource: candidate.locationSource,
      })),
    });
  } catch (error) {
    return serverError("lost.candidates", error);
  }
}

/* GET /api/lost/[id]/matches  캐시된 후보만 읽음. 재조회용 */

export async function getLostMatchesHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  try {
    const loaded = await loadOwnLost(request, id);
    if ("error" in loaded) return loaded.error;

    const items = await findMatchesForLost(loaded.lost.id);
    return okPrivate({ items });
  } catch (error) {
    return serverError("lost.matches.cached", error);
  }
}
