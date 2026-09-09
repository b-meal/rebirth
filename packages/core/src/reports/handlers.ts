import "server-only";

import {
  bumpShareCount,
  findPublicReport,
  findReportPhotoPaths,
  insertFlag,
  insertReportWithPhotos,
  listPublicReports,
  findNearbyReports,
} from "@rebirth/db";
import {
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
  createFlag,
  createReportChecked,
  nearbyQuery,
} from "@rebirth/types";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  fieldErrors,
  isUuid,
  notFound,
  ok,
  parseJson,
  peekRateLimit,
  serverError,
  tooManyRequests,
  type RouteContext,
} from "../http";
import { coarseGridMetersFor, snapToGrid, toWkt } from "../location/geo";
import {
  SIGNED_URL_TTL_SECONDS,
  createSignedUrl,
  photoObjectPath,
  removePhotos,
  uploadPhoto,
} from "../storage";

// 제보 API 의 라우트 핸들러. web 과 admin 이 각자 route.ts 에서 재수출해 씀
// 정확 좌표는 여기서 저장만 하고 어떤 응답에도 넣지 않음

const PHOTO_FIELD = "photo";
const PAYLOAD_FIELD = "payload";

const REPORT_NOT_FOUND = "찾는 제보가 없습니다. 주소를 다시 확인해 주십시오";

/* POST /api/reports  사진과 폼 데이터를 multipart 로 한 번에 받음 */

export async function createReportHandler(request: Request): Promise<Response> {
  // 검증 실패는 창을 소모하지 않음. 오타를 고치는 사용자가 잠기지 않게
  // 여기서는 보기만 하고 업로드 직전에 실제로 차감함
  const limitKey = clientKey(request, "createReport");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.createReport);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("사진과 제보 내용을 함께 보내야 합니다");
  }

  const photo = form.get(PHOTO_FIELD);
  if (!(photo instanceof File)) {
    return badRequest("사진을 한 장 올려 주십시오", {
      photo: "사진이 없습니다",
    });
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
    return badRequest("제보 내용이 없습니다", {
      payload: "제보 내용을 함께 보내야 합니다",
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return badRequest("제보 내용을 읽을 수 없습니다", {
      payload: "제보 내용 형식이 올바르지 않습니다",
    });
  }

  const parsed = createReportChecked.safeParse(payload);
  if (!parsed.success) {
    return badRequest("입력값을 확인해 주십시오", fieldErrors(parsed.error));
  }
  const input = parsed.data;

  // 부상·어린 개체 제보는 격자를 넓혀 특정 가능성을 낮춤
  const gridMeters = coarseGridMetersFor({
    visibleInjury: input.injury,
    young: input.conditionTags.some((t) => t.includes("어린") || t.includes("새끼")),
  });

  const exact = input.coordinates;
  const coarse = exact ? snapToGrid(exact, gridMeters) : undefined;

  // 입력이 전부 통과한 뒤에만 창을 차감함
  const limit = checkRateLimit(limitKey, RATE_LIMITS.createReport);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  // 업로드가 실패하면 제보 행을 만들지 않음. 사진 없는 공개 제보를 막음
  let storagePath: string | undefined;
  try {
    const buffer = await photo.arrayBuffer();
    // insert 전에 올려야 사진 없는 제보가 안 생김. 경로는 DB 가 기억하므로
    // 제보 id 와 같을 필요가 없고 옮기는 왕복도 만들지 않음
    const objectId = crypto.randomUUID();
    storagePath = photoObjectPath(objectId, 0);
    await uploadPhoto({
      path: storagePath,
      body: buffer,
      contentType: photo.type,
    });

    const row = await insertReportWithPhotos(
      {
        kind: input.kind,
        // 사진과 필수 입력이 모두 검증됐으므로 바로 공개 상태로 넣음
        status: "open",
        careSituation: input.careSituation,
        animalType: input.animalType,
        appearance: input.appearance,
        colors: input.colors,
        size: input.size,
        sex: input.sex,
        neutered: input.neutered,
        conditionTags: input.conditionTags,
        collar: input.collar ?? null,
        injury: input.injury ?? null,
        earTip: input.earTip ?? null,
        exactPoint: exact ? { x: exact.lng, y: exact.lat } : null,
        coarsePoint: coarse ? { x: coarse.lng, y: coarse.lat } : null,
        coarseGridM: gridMeters,
        areaCode: input.areaCode,
        areaName: input.areaName,
        occurredAt: input.occurredAt,
        aiEditedFields: input.aiEditedFields,
        aiRaw: input.aiRaw,
        aiModel: input.aiModel,
        aiAnalyzedAt: input.aiAnalyzedAt,
      },
      [{ storagePath, sortOrder: 0 }],
    );

    return ok({ id: row.id, status: row.status }, { status: 201 });
  } catch (error) {
    // 행이 안 생겼는데 사진만 남는 것을 막음. 실패해도 원래 오류를 덮지 않음
    if (storagePath) {
      await removePhotos([storagePath]).catch(() => undefined);
    }
    return serverError("reports.create", error);
  }
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

/* GET /api/reports  공개 목록. 좌표가 있으면 반경 검색 */

export async function listReportsHandler(request: Request): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams);

  try {
    if (query.lat !== undefined && query.lng !== undefined) {
      const parsed = nearbyQuery.safeParse(query);
      if (!parsed.success) {
        return badRequest("검색 조건을 확인해 주십시오", fieldErrors(parsed.error));
      }
      const items = await findNearbyReports(parsed.data);
      return ok({ items });
    }

    const kind = query.kind as "sighting" | "lost" | "sheltered" | undefined;
    const items = await listPublicReports(kind);
    return ok({ items });
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

    // 신고로 숨겨진 제보는 사진을 내주지 않음
    if (rows[0]!.status === "hidden") {
      return notFound("신고로 비공개된 제보입니다");
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
    if (!report) return notFound("찾는 제보가 없습니다");

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
