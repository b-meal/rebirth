import "server-only";

import { listUnreviewedPairs } from "@rebirth/db";
import { z } from "zod";

import { requireAdmin } from "../reports/admin-handlers";
import {
  badRequest,
  fieldErrors,
  okPrivate,
  serverError,
  serviceUnavailable,
} from "../http";
import { ReviewError } from "./review";
import { runMatchReview } from "./run-review";

// 재평가를 밖에서도 부를 수 있게 하는 운영 라우트
// 쌍을 주지 않으면 아직 재평가하지 않은 최고 점수 후보 하나를 골라 돌림

const body = z.object({
  lostId: z.uuid().optional(),
  sightingId: z.uuid().optional(),
});

export async function reviewMatchHandler(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let input: z.infer<typeof body> = {};
  try {
    const raw = await request.text();
    if (raw) input = body.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("식별자가 올바르지 않습니다", fieldErrors(error));
    }
    return badRequest("입력을 읽지 못했습니다");
  }

  let pair = input.lostId && input.sightingId ? input : undefined;
  if (!pair) {
    const [next] = await listUnreviewedPairs(1).catch(() => []);
    if (!next) return badRequest("재평가할 후보가 없습니다");
    pair = { lostId: next.lostId, sightingId: next.sightingId };
  }

  try {
    const outcome = await runMatchReview({
      lostId: pair.lostId!,
      sightingId: pair.sightingId!,
    });
    return okPrivate(outcome);
  } catch (error) {
    if (error instanceof ReviewError) {
      console.error(`[ai] 재평가 중단 (${error.kind})`, error.message);
      return serviceUnavailable(error.message);
    }
    return serverError("ai-review", error);
  }
}
