import "server-only";

import { insertPrecheckEvents } from "@rebirth/db";
import { precheckSource, precheckVerdict } from "@rebirth/types";
import { z } from "zod";

import { RATE_LIMITS, checkRateLimit, clientKey } from "../http";

// 선검사가 무엇을 어떻게 판정했는지만 받아 적는 자리
// 문턱을 표본 몇십 장이 아니라 실제로 올라오는 사진의 분포로 다시 잡으려고 둠
//
// 사진도 좌표도 세션도 받지 않음. 숫자와 판정만 오므로 지울 개인정보가 없음
// 판정을 막거나 늦추는 자리가 아니라 무엇이 오든 204 로 답하고 잘못된 것은 버림

/** 화면이 멈추면 안 되는 곁가지라 한 번에 보낼 수 있는 양을 좁게 둠 */
const MAX_EVENTS = 4;

const MAX_BYTES = 4 * 1024;

// 점수는 확률 합이라 0~1 을 벗어나면 만들어 낸 값
const eventSchema = z.object({
  deviceScore: z.number().min(0).max(1).nullish(),
  threshold: z.number().min(0).max(1).nullish(),
  deviceMs: z.number().int().min(0).max(60_000).nullish(),
  deviceVerdict: precheckVerdict.nullish(),
  serverVerdict: precheckVerdict.nullish(),
  verdict: precheckVerdict,
  source: precheckSource,
  photoWidth: z.number().int().min(1).max(20_000).nullish(),
  photoHeight: z.number().int().min(1).max(20_000).nullish(),
});

const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(MAX_EVENTS) });

/* POST /api/draft/precheck/log  판정 결과만 받아 적음. 본문 없이 204 로 답함 */

export async function precheckLogHandler(request: Request): Promise<Response> {
  const accepted = new Response(null, { status: 204 });

  // 한도를 넘으면 조용히 버림. 기록이 밀린다고 화면에서 할 일이 생기지는 않음
  if (!checkRateLimit(clientKey(request, "precheckLog"), RATE_LIMITS.precheckLog).allowed) {
    return accepted;
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return accepted;
    raw = JSON.parse(text);
  } catch {
    return accepted;
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return accepted;

  await insertPrecheckEvents(
    parsed.data.events.map((event) => ({
      ...event,
      // zod 의 nullish 는 undefined 를 남기고 drizzle 은 그 열을 아예 빼 버림
      deviceScore: event.deviceScore ?? null,
      threshold: event.threshold ?? null,
      deviceMs: event.deviceMs ?? null,
      deviceVerdict: event.deviceVerdict ?? null,
      serverVerdict: event.serverVerdict ?? null,
      photoWidth: event.photoWidth ?? null,
      photoHeight: event.photoHeight ?? null,
    })),
  );

  return accepted;
}
