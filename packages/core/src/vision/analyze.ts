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
- story 는 제보 글 본문입니다. 보이는 것만 두세 문장으로 적고 감정과 추측을 넣지 않습니다

confidence 는 사진만으로 외형을 정리한 정도입니다. 개체 식별 확률이 아닙니다.
warnings 는 사용자가 읽을 문장입니다. 사진이 어둡거나 멀거나 동물이 없을 때만 채웁니다.`;

const PROMPT = `이 사진의 동물 외형을 제보 초안으로 정리해 주십시오.
사진이 여러 장이면 같은 개체를 다른 각도에서 찍은 것으로 보고 초안 하나로 합쳐 주십시오.
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

export type AnalyzeImage = {
  base64: string;
  mediaType: string;
};

/** 한 요청에 넣는 사진 상한. 늘리면 이미지 토큰이 그대로 늘어남 */
export const ANALYZE_MAX_IMAGES = 2;

export type AnalyzePhotoInput = {
  /** 같은 개체의 사진. 첫 장이 대표 사진 */
  images: AnalyzeImage[];
  timeoutMs?: number;
};

export type AnalyzeOutcome = {
  result: AnalyzeResult;
  model: string;
  analyzedAt: Date;
};

/** ai_model 에 그대로 저장돼 더미로 만든 제보를 나중에 골라낼 수 있게 하는 표시 */
export const MOCK_MODEL = "mock";

// 스켈레톤과 초안 채우기를 눈으로 확인할 수 있을 만큼만 늦춤
const MOCK_LATENCY_MS = 800;

// 크레딧 없이 화면을 돌려보기 위한 고정 초안. ANALYZE_MOCK=1 일 때만 씀
const MOCK_RESULT: AnalyzeResult = {
  animalType: "dog",
  // 품종은 breedGuess 로 따로 들고 appearance 에 확정 표현을 섞지 않음
  breedGuess: "말티즈",
  appearance: "흰색 소형견, 털이 길고 엉킴",
  color: ["흰색"],
  size: "small",
  condition: "털이 엉키고 발이 흙에 젖음",
  story: "화단 근처에 혼자 있었고 사람이 다가가도 피하지 않음",
  collarOrHarness: false,
  visibleInjury: false,
  earTip: null,
  confidence: 0.72,
  warnings: [],
};

// ANALYZE_MOCK 값으로 판정 분기까지 눈으로 볼 수 있게 함
const MOCK_VARIANTS: Record<string, Partial<AnalyzeResult>> = {
  "1": {},
  "not-animal": {
    animalType: "unknown",
    breedGuess: null,
    appearance: "사진에서 동물을 찾지 못함",
    story: "",
    warnings: ["동물이 보이지 않음"],
  },
  "low-quality": { confidence: 0.2 },
};

function mockVariant(): Partial<AnalyzeResult> | null {
  const value = process.env.ANALYZE_MOCK ?? "";
  return value in MOCK_VARIANTS ? MOCK_VARIANTS[value] : null;
}

/** 더미 초안 사용 여부. 실제 모델을 부르지 않으므로 제출 자료에 이 결과를 쓰지 않음 */
export function analyzeMockEnabled(): boolean {
  return mockVariant() !== null;
}

/** 사진 한 장을 분석해 초안을 돌려줌. 실패는 VisionError 로 던져 호출부가 폴백을 고름 */
export async function analyzePhoto({
  images,
  timeoutMs = ANALYZE_TIMEOUT_MS,
}: AnalyzePhotoInput): Promise<AnalyzeOutcome> {
  if (images.length === 0) {
    throw new VisionError("api", "분석할 사진이 없습니다");
  }
  // 상한을 넘겨 받으면 대표 사진부터 잘라 씀
  const used = images.slice(0, ANALYZE_MAX_IMAGES);
  const blocks = used.map((image) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: assertMediaType(image.mediaType),
      data: image.base64,
    },
  }));

  if (analyzeMockEnabled()) {
    // ponytail: 고정 응답. 실제 모델 연결은 크레딧 충전 뒤에 확인해야 함
    console.warn("[analyze] ANALYZE_MOCK 이 켜져 있어 더미 초안을 돌려줍니다");
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return {
      result: { ...MOCK_RESULT, ...mockVariant() },
      model: MOCK_MODEL,
      analyzedAt: new Date(),
    };
  }

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
            content: [...blocks, { type: "text", text: PROMPT }],
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
    // 서버가 준 사유까지 남김. 이 값은 로그로만 나가고 사용자 응답은 고정 문구를 씀
    return new VisionError("api", `분석 API 오류 ${error.message}`);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new VisionError("timeout", "분석이 제한 시간을 넘겼습니다");
  }
  return new VisionError("api", "분석을 마치지 못했습니다");
}
