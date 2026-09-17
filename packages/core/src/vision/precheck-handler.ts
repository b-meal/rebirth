import "server-only";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  okPrivate,
  payloadTooLarge,
  peekRateLimit,
  tooManyRequests,
  unsupportedMediaType,
} from "../http";
import { isPrecheckMediaType, precheckAnimal } from "./precheck.ts";

// 1단계 선검사. 저장소도 세션도 쓰지 않아 사진을 확정하기 전에 부를 수 있음
// 판정을 못 내면 unknown 을 돌려주고 화면은 아무 말도 하지 않음. 제보를 막지 않음

const PHOTO_FIELD = "photo";

// 브라우저가 보내는 384px JPEG 는 30KB 안쪽. 상한을 좁게 둬 토큰과 남용을 함께 막음
const PRECHECK_MAX_BYTES = 512 * 1024;

export type PrecheckVerdict = "animal" | "not-animal" | "unknown";

/* POST /api/draft/precheck  축소본 한 장에 동물이 보이는지만 판정함 */

export async function precheckHandler(request: Request): Promise<Response> {
  const limitKey = clientKey(request, "precheck");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.precheck);
  // 한도를 넘으면 판정을 건너뜀. 2단계의 초안 분석이 같은 것을 다시 봄
  if (!peeked.allowed) return okPrivate(body("unknown"));

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("사진을 함께 보내야 합니다");
  }

  const photo = form.get(PHOTO_FIELD);
  if (!(photo instanceof File)) {
    return badRequest("사진을 한 장 보내 주십시오", { photo: "사진이 없습니다" });
  }
  if (photo.size > PRECHECK_MAX_BYTES) {
    return payloadTooLarge("사진 용량이 너무 큽니다", {
      photo: "축소한 사진만 보낼 수 있습니다",
    });
  }
  if (!isPrecheckMediaType(photo.type)) {
    return unsupportedMediaType("사진 형식을 확인해 주십시오", {
      photo: "JPG, PNG, WEBP 만 판정할 수 있습니다",
    });
  }

  const limit = checkRateLimit(limitKey, RATE_LIMITS.precheck);
  if (!limit.allowed) return okPrivate(body("unknown"));

  try {
    const outcome = await precheckAnimal({
      base64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
      mediaType: photo.type,
    });
    return okPrivate(
      body(outcome.animalPresent ? "animal" : "not-animal", outcome.model),
    );
  } catch (error) {
    // 모델 오류와 시간 초과는 정상 경로. 판정 없이 넘기고 2단계가 다시 봄
    console.error("[precheck]", error);
    return okPrivate(body("unknown"));
  }
}

function body(verdict: PrecheckVerdict, model?: string) {
  return { verdict, ...(model && { model }) };
}
