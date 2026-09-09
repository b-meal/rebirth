import "server-only";

import {
  insertDraftUpload,
  markDraftUploadFailed,
  markDraftUploadReady,
} from "@rebirth/db";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@rebirth/types";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  ensureDraftSession,
  okPrivate,
  payloadTooLarge,
  peekRateLimit,
  serverError,
  tooManyRequests,
  unsupportedMediaType,
} from "../http";
import { photoObjectPath, uploadPhoto } from "../storage";

// 제출 전 사진 업로드. 브라우저는 uploadId 만 받고 저장 경로를 알지 못함
// 사진이 세션에 묶여 남의 uploadId 를 자기 제보에 붙일 수 없음. POL-49

const PHOTO_FIELD = "photo";

// 검증 실패 사유. 화면이 같은 자리에서 재선택을 안내하는 값
const FAILURE = {
  tooLarge: "too_large",
  badType: "unsupported_type",
  storage: "storage_failed",
} as const;

/* POST /api/draft/uploads  사진 한 장을 받아 uploadId 를 돌려줌 */

export async function createUploadHandler(request: Request): Promise<Response> {
  const limitKey = clientKey(request, "upload");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.upload);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("사진을 함께 보내야 합니다");
  }

  const photo = form.get(PHOTO_FIELD);
  if (!(photo instanceof File)) {
    return badRequest("사진을 한 장 올려 주십시오", { photo: "사진이 없습니다" });
  }
  if (photo.size > PHOTO_MAX_BYTES) {
    return payloadTooLarge("사진 용량이 너무 큽니다", {
      photo: "8MB 까지 올릴 수 있습니다. 사진을 다시 골라 주십시오",
    });
  }
  if (!PHOTO_MIME_TYPES.includes(photo.type as (typeof PHOTO_MIME_TYPES)[number])) {
    return unsupportedMediaType("사진 형식을 확인해 주십시오", {
      photo: "JPG, PNG, WEBP, HEIC 만 올릴 수 있습니다",
    });
  }

  const revisionRaw = form.get("revision");
  const revision =
    typeof revisionRaw === "string" && /^[1-9]\d{0,3}$/.test(revisionRaw)
      ? Number(revisionRaw)
      : 1;

  const limit = checkRateLimit(limitKey, RATE_LIMITS.upload);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const session = await ensureDraftSession(request);
    // 행을 먼저 만들어 업로드가 실패해도 실패 사유를 남길 자리를 확보함
    const row = await insertDraftUpload({
      sessionId: session.sessionId,
      revision,
    });

    const storagePath = photoObjectPath(row.id, 0);
    try {
      await uploadPhoto({
        path: storagePath,
        body: await photo.arrayBuffer(),
        contentType: photo.type,
      });
    } catch (error) {
      await markDraftUploadFailed({
        id: row.id,
        sessionId: session.sessionId,
        failureCode: FAILURE.storage,
      }).catch(() => undefined);
      console.error("[draft.upload] 스토리지 업로드 실패", error);
      return serverError("draft.upload.storage", error);
    }

    await markDraftUploadReady({
      id: row.id,
      sessionId: session.sessionId,
      storagePath,
      contentType: photo.type,
      bytes: photo.size,
    });

    return okPrivate(
      { uploadId: row.id, revision: row.revision, status: "ready" },
      {
        status: 201,
        ...(session.setCookie && {
          headers: { "set-cookie": session.setCookie },
        }),
      },
    );
  } catch (error) {
    return serverError("draft.upload", error);
  }
}

export { FAILURE as UPLOAD_FAILURE_CODES };
