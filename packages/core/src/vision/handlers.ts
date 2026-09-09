import "server-only";

import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@rebirth/types";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  ok,
  peekRateLimit,
  serverError,
  tooManyRequests,
} from "../http";
import { VisionError, analyzePhoto } from "./analyze";
import { ANALYZE_FAILED_MESSAGE, adviseFromResult } from "./guidance";

// POST /api/analyze  사진을 받아 초안을 돌려줌
// 제보가 아직 없는 단계라 사진을 직접 받음. 저장은 하지 않음

const PHOTO_FIELD = "photo";

export async function analyzeHandler(request: Request): Promise<Response> {
  const limitKey = clientKey(request, "analyze");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.analyze);
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
    return badRequest("사진 용량이 너무 큽니다", {
      photo: "8MB 까지 올릴 수 있습니다. 사진을 다시 골라 주십시오",
    });
  }
  if (!PHOTO_MIME_TYPES.includes(photo.type as (typeof PHOTO_MIME_TYPES)[number])) {
    return badRequest("사진 형식을 확인해 주십시오", {
      photo: "JPG, PNG, WEBP 만 됩니다",
    });
  }

  // 모델 호출 직전에만 창을 차감함
  const limit = checkRateLimit(limitKey, RATE_LIMITS.analyze);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    const outcome = await analyzePhoto({ base64, mediaType: photo.type });
    const advice = adviseFromResult(outcome.result);

    return ok({
      // confidence 는 스키마에 있지만 화면에 쓰지 않음. 지표 저장용으로만 내려보냄
      draft: outcome.result,
      advice: advice.state,
      message: advice.message,
      model: outcome.model,
      analyzedAt: outcome.analyzedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof VisionError) {
      // 실패는 정상 경로. 화면은 빈 폼을 열어 직접 입력을 받음
      console.error(`[analyze] ${error.kind} ${error.message}`);
      const status = error.kind === "rate-limit" ? 503 : 502;
      return Response.json(
        { message: ANALYZE_FAILED_MESSAGE, advice: "failed", reason: error.kind },
        { status, headers: { "cache-control": "no-store" } },
      );
    }
    return serverError("analyze", error);
  }
}
