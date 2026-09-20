import "server-only";

import {
  attachIdempotencyResult,
  bumpShareCount,
  claimIdempotencyKey,
  claimUploads,
  findDraftLocation,
  findIdempotencyKey,
  findPublicReport,
  findReportPhotoPaths,
  findUsableUploads,
  grantManageAccess,
  insertConsentRecords,
  insertFlag,
  insertReportComment,
  findLatestSucceededAnalysis,
  insertReportWithPhotos,
  listPublicReports,
  listReportCards,
  listReportComments,
  releaseIdempotencyKey,
  toggleReportInterest,
  type PublicListCursor,
  type ReportCommentCursor,
} from "@rebirth/db";
import {
  COMMENT_PAGE_SIZE,
  INITIAL_LIFECYCLE,
  LIST_PAGE_SIZE,
  createComment,
  createFlag,
  createReport,
  listQuery,
  toggleInterest,
  type CreateReport,
  type AnalyzeResult,
} from "@rebirth/types";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  createManageSession,
  ensureDraftSession,
  fieldErrors,
  hashToken,
  isUuid,
  issueToken,
  logFailure,
  notFound,
  ok,
  okPrivate,
  parseJson,
  peekRateLimit,
  serverError,
  tooManyRequests,
  type RouteContext,
} from "../http";
import { coarseGridMetersFor, snapToGrid } from "../location/geo";
import { scoreSightingAgainstLost } from "../matching/alerts";
import { embedReport } from "../matching/embed-report";
import { SIGNED_URL_TTL_SECONDS, createSignedThumbUrls, createSignedUrl } from "../storage";

// 제보 API 의 라우트 핸들러. web 과 admin 이 각자 route.ts 에서 재수출해 씀
// 정확 좌표는 여기서 저장만 하고 어떤 응답에도 넣지 않음

const REPORT_NOT_FOUND = "찾는 제보가 없습니다. 주소를 다시 확인해 주십시오";
const DRAFT_EXPIRED =
  "작성 중이던 정보가 만료됐습니다. 사진과 위치를 다시 확인해 주십시오";

/**
 * 목록 카드에 붙일 대표 사진
 * 공개 목록 질의는 저장 경로를 담지 않아 id 로 한 번 더 읽어 서명함
 * 목록 API 와 서버에서 첫 장을 그리는 화면이 같은 함수를 써야 이어 읽은 카드가 달라 보이지 않음
 */
export async function attachPhotoUrls<T extends { id: string }>(
  rows: T[],
): Promise<(T & { photoUrl: string | null })[]> {
  if (rows.length === 0) return [];

  let byId = new Map<string, string>();
  try {
    const cards = await listReportCards(rows.map((row) => row.id));
    const paths = cards.flatMap((card) => (card.photoPath ? [card.photoPath] : []));
    const signed = await createSignedThumbUrls(paths);

    byId = new Map(
      cards.flatMap((card) => {
        const url = card.photoPath ? signed.get(card.photoPath) : undefined;
        return url ? [[card.id, url] as const] : [];
      }),
    );
  } catch (error) {
    // 사진을 못 읽어도 목록은 보여야 함. 대신 사진 없는 목록이 왜 나왔는지는 남김
    logFailure("reports.listPhotos", error);
  }

  return rows.map((row) => ({ ...row, photoUrl: byId.get(row.id) ?? null }));
}

/* POST /api/reports  초안 세션의 사진·위치 참조를 제보로 확정함 */

export async function createReportHandler(
  request: Request,
  options: { reporterId?: string } = {},
): Promise<Response> {
  // 검증 실패는 창을 소모하지 않음. 오타를 고치는 사용자가 잠기지 않게
  const limitKey = clientKey(request, "createReport");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.createReport);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  const parsed = await parseJson(request, createReport);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  // 실종 신고는 전용 경로를 씀. 후보 조회 규칙이 달라 섞지 않음
  if (input.kind === "lost") {
    return badRequest("실종 신고는 실종 신고 경로로 보내야 합니다", {
      kind: "이 경로로는 발견 제보만 등록할 수 있습니다",
    });
  }

  const session = await ensureDraftSession(request);
  const setCookie = session.setCookie;

  try {
    // 응답이 유실된 재시도가 제보를 두 건 만들지 않게 키를 먼저 선점함
    const claimed = await claimIdempotencyKey({
      key: input.idempotencyKey,
      sessionId: session.sessionId,
    });
    if (!claimed) {
      const prior = await findIdempotencyKey({
        key: input.idempotencyKey,
        sessionId: session.sessionId,
      });
      // 같은 키의 저장이 이미 끝났으면 그 결과를 그대로 돌려줌
      if (prior?.reportId) {
        return okPrivate({ id: prior.reportId, duplicate: true });
      }
      // 앞선 요청이 아직 진행 중. 화면은 잠시 후 다시 확인함
      return okPrivate({ pending: true }, { status: 202 });
    }

    const saved = await saveReport({
      input,
      sessionId: session.sessionId,
      kind: input.kind,
      careSituation: input.careSituation,
      conditionTags: input.conditionTags,
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

    // 닮은 실종 신고의 점수를 미리 남겨 보호자 알림함이 셀 수 있게 함
    // 이 경로는 발견 계열만 받으므로 종류를 다시 가리지 않음
    // 저장은 이미 끝났으므로 실패해도 응답을 막지 않음. 후보 화면을 열면 다시 계산됨
    await scoreSightingAgainstLost(saved.id).catch((error) => {
      logFailure("reports.create.score", error);
    });

    // 벡터도 저장 뒤에 남김, 게이트웨이가 막혀도 제보는 이미 저장됐음
    await embedReport(saved.id, {
      animalType: input.animalType,
      breedGuess: input.breedGuess ?? null,
      colors: input.colors,
      size: input.size,
      conditionTags: input.conditionTags,
      appearance: input.appearance,
    }).catch((error) => {
      logFailure("reports.create.embed", error);
    });

    return okPrivate(
      {
        id: saved.id,
        lifecycle: saved.lifecycle,
        version: saved.version,
        // 관리 주소는 이 응답에서 한 번만 나감. 저장하지 않으면 다시 찾을 수 없음
        manageToken: saved.manageToken,
      },
      {
        status: 201,
        headers: {
          "set-cookie": [setCookie, saved.manageCookie]
            .filter(Boolean)
            .join(", "),
        },
      },
    );
  } catch (error) {
    await releaseIdempotencyKey(input.idempotencyKey).catch(() => undefined);
    return serverError("reports.create", error);
  }
}

type SaveInput = {
  input: CreateReport;
  sessionId: string;
  kind: "sighting" | "sheltered" | "lost";
  careSituation: CreateReport["careSituation"];
  conditionTags: string[];
  /** 로그인 상태면 계정 id, 비로그인 제보는 비움 */
  reporterId?: string;
  /** 실종 신고에 묶는 내 동물. 호출부가 소유를 확인한 뒤에만 넘김 */
  petId?: string;
};

/**
 * 사진·위치 참조를 확인하고 제보 행을 만듦. 발견 제보와 실종 신고가 함께 씀
 * 참조가 세션 소유가 아니면 여기서 끊겨 남의 자료가 붙지 않음. POL-49
 */
async function saveReport({
  input,
  sessionId,
  kind,
  careSituation,
  conditionTags,
  reporterId,
  petId,
}: SaveInput): Promise<
  | { error: Response }
  | {
      id: string;
      lifecycle: string;
      version: number;
      manageToken: string;
      manageCookie: string;
    }
> {
  const uploads = await findUsableUploads({
    sessionId,
    ids: input.uploadIds,
  });
  // 한 장이라도 만료·사용됨이면 무엇이 빠졌는지 알려 그것만 다시 받음
  if (uploads.length !== input.uploadIds.length) {
    return {
      error: badRequest(DRAFT_EXPIRED, {
        uploadIds: "사진을 다시 올려 주십시오",
      }),
    };
  }

  const location = await findDraftLocation({
    sessionId,
    id: input.locationToken,
  });
  if (!location) {
    return {
      error: badRequest(DRAFT_EXPIRED, {
        locationToken: "위치를 다시 확인해 주십시오",
      }),
    };
  }

  // 부상·어린 개체 제보는 격자를 넓혀 특정 가능성을 낮춤
  const gridMeters = coarseGridMetersFor({
    visibleInjury: input.injury,
    young: conditionTags.some(
      (t) => t.includes("어린") || t.includes("새끼"),
    ),
  });

  // 수동 지역 선택은 좌표를 만들지 않음. 중심점을 목격 위치로 저장하지 않음
  const exact =
    location.lat && location.lng
      ? { lat: Number(location.lat), lng: Number(location.lng) }
      : undefined;
  const coarse = exact ? snapToGrid(exact, gridMeters) : undefined;

  // 분석 결과를 제보에 이어 붙임. 없으면 손으로 채운 제보라 그대로 둠
  const analysis = await findLatestSucceededAnalysis({
    sessionId,
    uploadIds: input.uploadIds,
  }).catch(() => undefined);

  const manageToken = issueToken();
  const row = await insertReportWithPhotos(
    {
      kind,
      // 사진과 필수 입력이 모두 검증됐으므로 바로 공개 상태로 넣음
      visibility: "public",
      reporterId: reporterId ?? null,
      // 발견 제보에는 붙지 않음. DB 체크 제약도 같은 것을 막고 있음
      petId: kind === "lost" ? (petId ?? null) : null,
      lifecycle: INITIAL_LIFECYCLE[kind],
      careSituation,
      manageTokenHash: hashToken(manageToken),
      manageTokenIssuedAt: new Date(),
      animalType: input.animalType,
      breedGuess: input.breedGuess ?? null,
      appearance: input.appearance,
      colors: input.colors,
      size: input.size,
      sex: input.sex,
      neutered: input.neutered,
      conditionTags,
      collar: input.collar ?? null,
      injury: input.injury ?? null,
      // 고양이가 아니면 귀 끝은 의미가 없고 DB 체크 제약이 거부함. 여기서 한 번에 눌러 둠
      earTip: input.animalType === "cat" ? (input.earTip ?? null) : null,
      exactPoint: exact ? { x: exact.lng, y: exact.lat } : null,
      coarsePoint: coarse ? { x: coarse.lng, y: coarse.lat } : null,
      coarseGridM: gridMeters,
      locationSource: location.source,
      locationAccuracyM: location.accuracyM,
      areaCodeSystem: location.areaCodeSystem,
      areaCode: location.areaCode,
      areaName: location.areaName,
      areaCodeVersion: location.areaCodeVersion,
      landmarkNote: input.landmarkNote,
      occurredAt: input.occurredAt,
      aiEditedFields: input.aiEditedFields,
      aiRaw: (analysis?.result as AnalyzeResult | undefined) ?? null,
      aiModel: analysis?.model ?? null,
      aiAnalyzedAt: analysis?.finishedAt ?? null,
    },
    uploads.map((upload, index) => ({
      storagePath: upload.storagePath!,
      sortOrder: index,
      width: upload.width,
      height: upload.height,
    })),
  );

  // 업로드를 사용 처리해 파기 대상에서 뺌
  await claimUploads({
    sessionId,
    ids: input.uploadIds,
    reportId: row.id,
  });

  // 필수와 선택을 각각 남김. 일괄 동의로 뭉치면 POL-38 위반
  await insertConsentRecords([
    {
      reportId: row.id,
      kind: "required_terms",
      documentVersion: input.consents.documentVersion,
    },
    {
      reportId: row.id,
      kind: "required_privacy",
      documentVersion: input.consents.documentVersion,
    },
    ...(input.consents.optionalAi
      ? [
          {
            reportId: row.id,
            kind: "optional_ai" as const,
            documentVersion: input.consents.documentVersion,
          },
        ]
      : []),
    ...(input.consents.optionalLocation
      ? [
          {
            reportId: row.id,
            kind: "optional_location" as const,
            documentVersion: input.consents.documentVersion,
          },
        ]
      : []),
  ]);

  // 작성자가 바로 관리할 수 있게 관리 세션을 함께 발급함
  const manage = await createManageSession();
  await grantManageAccess({ sessionId: manage.sessionId, reportId: row.id });

  return {
    id: row.id,
    lifecycle: row.lifecycle,
    version: row.version,
    manageToken,
    manageCookie: manage.setCookie,
  };
}

/* GET /api/reports/[id]  공개 상세. 정확 좌표와 제보자 정보를 내주지 않음 */

export async function getReportHandler(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound(REPORT_NOT_FOUND);
  try {
    const report = await findPublicReport(id);
    if (!report) {
      return notFound(REPORT_NOT_FOUND);
    }
    return ok(report);
  } catch (error) {
    return serverError("reports.get", error);
  }
}

/* GET /api/reports  공개 목록. 행정구역 코드로 좁히고 커서로 넘김 */

// 커서는 목격 시각과 id 를 한 문자열로 묶음. 내부 형식이라 서명하지 않음
function decodeCursor(value: string): PublicListCursor | undefined {
  const separator = value.indexOf("_");
  if (separator < 0) return undefined;
  const occurredAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (Number.isNaN(occurredAt.getTime()) || !isUuid(id)) return undefined;
  return { occurredAt, id };
}

function encodeCursor(row: { occurredAt: Date; id: string }): string {
  return `${row.occurredAt.toISOString()}_${row.id}`;
}

export async function listReportsHandler(request: Request): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = listQuery.safeParse(query);
  if (!parsed.success) {
    return badRequest("검색 조건을 확인해 주십시오", fieldErrors(parsed.error));
  }
  const { days, cursor, ...filters } = parsed.data;

  if (cursor && !decodeCursor(cursor)) {
    return badRequest("목록을 처음부터 다시 불러와 주십시오", {
      cursor: "커서가 올바르지 않습니다",
    });
  }

  try {
    // 한 건 더 읽어 다음 페이지 존재를 판단함. 총 건수 질의를 피함
    const rows = await listPublicReports({
      ...filters,
      fromOccurredAt: new Date(Date.now() - days * 86_400_000),
      ...(cursor && { cursor: decodeCursor(cursor) }),
      limit: LIST_PAGE_SIZE + 1,
    });

    const items = rows.slice(0, LIST_PAGE_SIZE);
    const last = items.at(-1);
    return ok({
      items: await attachPhotoUrls(items),
      nextCursor:
        rows.length > LIST_PAGE_SIZE && last ? encodeCursor(last) : null,
    });
  } catch (error) {
    return serverError("reports.list", error);
  }
}

/* GET /api/reports/[id]/photo  조회용 서명 URL. 버킷이 비공개라 이 경로만 씀 */

export async function getReportPhotoHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const limit = checkRateLimit(
    clientKey(request, "signPhoto"),
    RATE_LIMITS.signPhoto,
  );
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const { id } = await context.params;
  if (!isUuid(id)) return notFound("사진이 없습니다");

  try {
    const rows = await findReportPhotoPaths(id);
    if (rows.length === 0) return notFound("사진이 없습니다");

    // 숨김·삭제된 제보는 사진을 내주지 않음. 발급마다 다시 확인함. POL-10
    if (rows[0]!.visibility !== "public") {
      return notFound("사진이 없습니다");
    }

    const photos = await Promise.all(
      rows.map(async (row) => {
        const signed = await createSignedUrl(row.storagePath);
        return {
          url: signed.url,
          expiresAt: signed.expiresAt.toISOString(),
          sortOrder: row.sortOrder,
        };
      }),
    );

    return ok(
      { photos, ttlSeconds: SIGNED_URL_TTL_SECONDS },
      // 서명 URL 자체가 만료를 갖고 있어 그보다 짧게만 캐시
      { headers: { "cache-control": `private, max-age=${SIGNED_URL_TTL_SECONDS / 2}` } },
    );
  } catch (error) {
    return serverError("reports.photo", error);
  }
}

/* POST /api/reports/[id]/flag  제3자 신고. 즉시 숨기지 않고 검수 대기로 둠 */

export async function createFlagHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const limitKey = clientKey(request, "createFlag");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.createFlag);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  const { id } = await context.params;
  if (!isUuid(id)) return notFound(REPORT_NOT_FOUND);

  const parsed = await parseJson(request, createFlag);
  if ("response" in parsed) return parsed.response;

  // 사유가 유효할 때만 창을 차감함
  const limit = checkRateLimit(limitKey, RATE_LIMITS.createFlag);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const report = await findPublicReport(id);
    if (!report) return notFound(REPORT_NOT_FOUND);

    const row = await insertFlag({
      reportId: id,
      reason: parsed.data.reason,
      detail: parsed.data.detail,
    });

    return ok({ id: row?.id, received: true }, { status: 201 });
  } catch (error) {
    return serverError("reports.flag", error);
  }
}

/* POST /api/reports/[id]/comments  공개 댓글. 표시명은 서버가 제보 안에서만 매김 */

export async function createCommentHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const limitKey = clientKey(request, "createComment");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.comment);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  const { id } = await context.params;
  if (!isUuid(id)) return notFound(REPORT_NOT_FOUND);

  const parsed = await parseJson(request, createComment);
  if ("response" in parsed) return parsed.response;

  // 본문이 유효할 때만 창을 차감함
  const limit = checkRateLimit(limitKey, RATE_LIMITS.comment);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const report = await findPublicReport(id);
    if (!report) return notFound(REPORT_NOT_FOUND);

    // 초안 세션을 작성자 구분에만 씀. 같은 사람의 댓글을 이 제보 안에서 묶어 보이게 함
    const session = await ensureDraftSession(request);
    const row = await insertReportComment({
      reportId: id,
      sessionId: session.sessionId,
      body: parsed.data.body,
    });

    return okPrivate(row, {
      status: 201,
      ...(session.setCookie && {
        headers: { "set-cookie": session.setCookie },
      }),
    });
  } catch (error) {
    return serverError("reports.comment", error);
  }
}

/* GET /api/reports/[id]/comments  댓글 이어 읽기. 첫 쪽은 상세 화면이 서버에서 그림 */

// 커서는 단 시각과 id 를 한 문자열로 묶음. 내부 형식이라 서명하지 않음
function decodeCommentCursor(value: string): ReportCommentCursor | undefined {
  const separator = value.indexOf("_");
  if (separator < 0) return undefined;
  const createdAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || !isUuid(id)) return undefined;
  return { createdAt, id };
}

export async function listCommentsHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound(REPORT_NOT_FOUND);

  const raw = new URL(request.url).searchParams.get("cursor");
  const after = raw ? decodeCommentCursor(raw) : undefined;
  if (raw && !after) {
    return badRequest("댓글을 처음부터 다시 불러와 주십시오", {
      cursor: "커서가 올바르지 않습니다",
    });
  }

  try {
    // 한 건 더 읽어 다음 쪽 존재를 판단함. 총 건수 질의를 피함
    const rows = await listReportComments(id, {
      ...(after && { after }),
      limit: COMMENT_PAGE_SIZE + 1,
    });

    const items = rows.slice(0, COMMENT_PAGE_SIZE);
    const last = items.at(-1);
    return ok({
      items,
      nextCursor:
        rows.length > COMMENT_PAGE_SIZE && last
          ? `${last.createdAt.toISOString()}_${last.id}`
          : null,
    });
  } catch (error) {
    return serverError("reports.comments", error);
  }
}

/* POST /api/reports/[id]/interest  관심 켜고 끄기. 누가 눌렀는지는 응답에 넣지 않음 */

export async function toggleInterestHandler(
  request: Request,
  context: RouteContext,
  options: { userId?: string } = {},
): Promise<Response> {
  const limitKey = clientKey(request, "interest");
  const limit = checkRateLimit(limitKey, RATE_LIMITS.interest);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const { id } = await context.params;
  if (!isUuid(id)) return notFound(REPORT_NOT_FOUND);

  const parsed = await parseJson(request, toggleInterest);
  if ("response" in parsed) return parsed.response;

  try {
    const report = await findPublicReport(id);
    if (!report) return notFound(REPORT_NOT_FOUND);

    // 초안 세션을 관심 주체로만 씀. 계정 없이도 눌러 둔 상태가 유지됨
    const session = await ensureDraftSession(request);
    const count = await toggleReportInterest({
      reportId: id,
      sessionId: session.sessionId,
      userId: options.userId,
      interested: parsed.data.interested,
    });

    return okPrivate(
      { interested: parsed.data.interested, count },
      session.setCookie ? { headers: { "set-cookie": session.setCookie } } : undefined,
    );
  } catch (error) {
    return serverError("reports.interest", error);
  }
}

/* POST /api/reports/[id]/share  공유 횟수. 지표용이라 실패해도 화면을 막지 않음 */

export async function shareReportHandler(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound(REPORT_NOT_FOUND);
  try {
    const row = await bumpShareCount(id);
    if (!row) return notFound(REPORT_NOT_FOUND);
    return ok({ shareCount: row.shareCount });
  } catch (error) {
    return serverError("reports.share", error);
  }
}

export { saveReport, DRAFT_EXPIRED };
