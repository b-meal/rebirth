import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  PRECHECK_TIMEOUT_MS,
  precheckRequest,
  readVerdict,
  type PrecheckImage,
} from "./precheck-prompt.ts";
export {
  PRECHECK_MAX_EDGE,
  PRECHECK_MODEL,
  PRECHECK_TIMEOUT_MS,
  type PrecheckImage,
} from "./precheck-prompt.ts";

// 1단계 선검사. 사진을 고른 자리에서 동물이 보이는지만 물어 잘못 고른 사진을 곧장 알림
// 저장소를 거치지 않고 축소본을 그대로 받아 실패해도 남는 것이 없음
// 초안 분석은 2단계에서 그대로 돌아 이 판정은 앞단 한 겹일 뿐임

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isPrecheckMediaType(value: string): value is PrecheckImage["mediaType"] {
  return SUPPORTED_MEDIA_TYPES.includes(value as PrecheckImage["mediaType"]);
}

export type PrecheckOutcome = {
  /** 동물이 보이는지. 판정을 못 받으면 부르는 쪽이 통과로 다룸 */
  animalPresent: boolean;
  model: string;
  latencyMs: number;
};

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 없습니다");
  // 1단계에서 기다리는 시간이라 재시도로 두 배를 쓰지 않음. 실패는 통과로 넘김
  cached = new Anthropic({ apiKey, maxRetries: 0 });
  return cached;
}

/** 축소본 한 장에 동물이 보이는지 물음. 실패는 던져서 부르는 쪽이 통과로 처리함 */
export async function precheckAnimal(
  image: PrecheckImage,
  timeoutMs: number = PRECHECK_TIMEOUT_MS,
): Promise<PrecheckOutcome> {
  const startedAt = Date.now();
  const response = await client().messages.create(precheckRequest(image), {
    timeout: timeoutMs,
  });

  // 안전 분류기가 거절하면 판정이 없는 것이므로 통과로 둠
  if (response.stop_reason === "refusal") {
    return { animalPresent: true, model: response.model, latencyMs: Date.now() - startedAt };
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    animalPresent: readVerdict(text),
    model: response.model,
    latencyMs: Date.now() - startedAt,
  };
}
