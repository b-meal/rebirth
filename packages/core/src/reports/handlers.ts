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
  insertReportWithPhotos,
  listPublicReports,
  releaseIdempotencyKey,
  type PublicListCursor,
} from "@rebirth/db";
import {
  INITIAL_LIFECYCLE,
  LIST_PAGE_SIZE,
  createFlag,
  createReport,
  listQuery,
  type CreateReport,
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
import { SIGNED_URL_TTL_SECONDS, createSignedUrl } from "../storage";

// 제보 API 의 라우트 핸들러. web 과 admin 이 각자 route.ts 에서 재수출해 씀
// 정확 좌표는 여기서 저장만 하고 어떤 응답에도 넣지 않음

const REPORT_NOT_FOUND = "찾는 제보가 없습니다. 주소를 다시 확인해 주십시오";
const DRAFT_EXPIRED =
  "작성 중이던 정보가 만료됐습니다. 사진과 위치를 다시 확인해 주십시오";

/* POST /api/reports  초안 세션의 사진·위치 참조를 제보로 확정함 */

export async function createReportHandler(request: Request): Promise<Response> {
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

  const manageToken = issueToken();
  const row = await insertReportWithPhotos(
    {
      kind,
      // 사진과 필수 입력이 모두 검증됐으므로 바로 공개 상태로 넣음
      visibility: "public",
      lifecycle: INITIAL_LIFECYCLE[kind],
      careSituation,
      manageTokenHash: hashToken(manageToken),
      manageTokenIssuedAt: new Date(),
      animalType: input.animalType,
      appearance: input.appearance,
      colors: input.colors,
      size: input.size,
      sex: input.sex,
      neutered: input.neutered,
      conditionTags,
      collar: input.collar ?? null,
      injury: input.injury ?? null,
      earTip: input.earTip ?? null,
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
      items,
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
