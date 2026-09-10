import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { analyzeResult, type AnalyzeResult } from "@rebirth/types";

// 사진에서 외형 정보를 뽑아 제보 초안을 만듦
// 품종을 맞히는 것이 목적이 아니라 제보를 빠르고 일관되게 정리하는 것이 목적

export const VISION_MODEL = "claude-sonnet-5";

// 사용자가 위치를 정하는 동안 끝나야 함. 넘으면 수동 입력으로 돌림
export const ANALYZE_TIMEOUT_MS = 8_000;

export type VisionErrorKind = "no-config" | "timeout" | "rate-limit" | "api" | "parse";

export class VisionError extends Error {
  readonly kind: VisionErrorKind;

  constructor(kind: VisionErrorKind, message: string) {
    super(message);
    this.name = "VisionError";
    this.kind = kind;
  }
}

const SYSTEM = `당신은 길에서 발견된 동물의 사진을 보고 제보 초안을 정리합니다.

원칙
- 품종을 단정하지 않습니다. "흰색 소형견, 말티즈 계열 추정" 처럼 색과 크기를 앞에 두고 품종은 추정으로만 덧붙입니다
- 사진에서 보이는 것만 적습니다. 나이, 건강 상태, 성격, 유기 여부를 추측하지 않습니다
- 의료 판단을 하지 않습니다. 눈에 보이는 상태만 적습니다. 예를 들어 "뒷다리를 딛지 않음" 은 적고 "골절" 은 적지 않습니다
- 동물이 없거나 판단할 수 없으면 animalType 을 unknown 으로 두고 warnings 에 이유를 적습니다
- 모든 문장은 한국어로 쓰고 명사형으로 끝냅니다

confidence 는 사진만으로 외형을 정리한 정도입니다. 개체 식별 확률이 아닙니다.
warnings 는 사용자가 읽을 문장입니다. 사진이 어둡거나 멀거나 동물이 없을 때만 채웁니다.`;

const PROMPT = `이 사진의 동물 외형을 제보 초안으로 정리해 주십시오.
보이지 않는 항목은 추측하지 말고 목줄·부상·귀 끝은 확실하지 않으면 null 로 두십시오.
breedGuess 는 품종명만 짧게 적고 확실하지 않으면 null 로 두십시오. 확정 표현은 쓰지 마십시오.`;

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new VisionError("no-config", "ANTHROPIC_API_KEY 가 없습니다");
  }
  cached = new Anthropic({ apiKey, maxRetries: 1 });
  return cached;
}

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function assertMediaType(value: string): SupportedMediaType {
  if (!SUPPORTED_MEDIA_TYPES.includes(value as SupportedMediaType)) {
    throw new VisionError("api", `지원하지 않는 이미지 형식입니다: ${value}`);
  }
  return value as SupportedMediaType;
}

export type AnalyzePhotoInput = {
  base64: string;
  mediaType: string;
  timeoutMs?: number;
};

export type AnalyzeOutcome = {
  result: AnalyzeResult;
  model: string;
  analyzedAt: Date;
};

/** 사진 한 장을 분석해 초안을 돌려줌. 실패는 VisionError 로 던져 호출부가 폴백을 고름 */
export async function analyzePhoto({
  base64,
  mediaType,
  timeoutMs = ANALYZE_TIMEOUT_MS,
}: AnalyzePhotoInput): Promise<AnalyzeOutcome> {
  const media = assertMediaType(mediaType);

  let response;
  try {
    response = await client().messages.parse(
      {
        model: VISION_MODEL,
        max_tokens: 2048,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: media, data: base64 },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(analyzeResult) },
      },
      { timeout: timeoutMs },
    );
  } catch (error) {
    throw toVisionError(error);
  }

  // 안전 분류기가 거절하면 content 를 읽기 전에 걸러냄
  if (response.stop_reason === "refusal") {
    throw new VisionError("api", "안전 정책으로 분석이 거절됐습니다");
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new VisionError("parse", "분석 결과를 스키마로 읽지 못했습니다");
  }

  return {
    result: parsed,
    model: response.model,
    analyzedAt: new Date(),
  };
}

function toVisionError(error: unknown): VisionError {
  if (error instanceof VisionError) return error;

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new VisionError("timeout", "분석이 제한 시간을 넘겼습니다");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new VisionError("rate-limit", "분석 요청이 한도를 넘었습니다");
  }
  if (error instanceof Anthropic.APIError) {
    // 키가 섞일 수 있어 상태 코드만 남김
    return new VisionError("api", `분석 API 오류 ${error.status ?? ""}`);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new VisionError("timeout", "분석이 제한 시간을 넘겼습니다");
  }
  return new VisionError("api", "분석을 마치지 못했습니다");
}
