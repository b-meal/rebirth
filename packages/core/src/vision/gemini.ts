import "server-only";

import { analyzeResult } from "@rebirth/types";
import { z } from "zod";

import { VisionError, type AnalyzeImage, type AnalyzeOutcome } from "./analyze";

// 크레딧이 없는 동안 화면을 실제 모델 응답으로 돌려보기 위한 개발 전용 경로
// ANALYZE_PROVIDER=gemini 일 때만 analyze.ts 가 동적 import 로 불러옴
//
// 무료 티어 약관상 입력과 출력이 구글 학습에 쓰이고 사람 검토자가 읽음
// 실제 제보 사진을 보내지 않고 직접 찍은 테스트 사진으로만 씀
// 크레딧 충전 뒤 이 파일과 analyze.ts 의 분기를 함께 지움

export const GEMINI_MODEL = "gemini-3.8-flash";

// 무료 티어 응답이 5~13초로 널뛰어 8초인 ANALYZE_TIMEOUT_MS 로는 자주 끊김
// 개발용 경로라 사용자 대기 시간을 신경 쓰지 않고 넉넉히 둠
const GEMINI_TIMEOUT_MS = 25_000;

// zod 스키마를 그대로 받지 않아 JSON Schema 로 바꿔 넘김
// $schema 키는 response_format.schema 가 받지 않아 떼어냄
const { $schema: _schemaUrl, ...RESPONSE_SCHEMA } = z.toJSONSchema(analyzeResult, {
  target: "draft-7",
});

export type GeminiAnalyzeInput = {
  images: AnalyzeImage[];
  system: string;
  prompt: string;
  timeoutMs: number;
};

export async function analyzeWithGemini({
  images,
  system,
  prompt,
  timeoutMs,
}: GeminiAnalyzeInput): Promise<AnalyzeOutcome> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new VisionError("no-config", "GEMINI_API_KEY 가 없습니다");
  }

  // 프로덕션 번들에 들어가지 않게 분기 안에서만 불러옴
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey });

  let interaction;
  try {
    interaction = await client.interactions.create(
      {
        model: GEMINI_MODEL,
        system_instruction: system,
        input: [
          ...images.map((image) => ({
            type: "image" as const,
            data: image.base64,
            mime_type: image.mediaType,
          })),
          { type: "text" as const, text: prompt },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: RESPONSE_SCHEMA,
        },
        generation_config: { max_output_tokens: 2048 },
      },
      { timeout_ms: Math.max(timeoutMs, GEMINI_TIMEOUT_MS) },
    );
  } catch (error) {
    throw toGeminiError(error);
  }

  const text = interaction.output_text;
  if (!text) {
    throw new VisionError("parse", "분석 결과가 비어 있습니다");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new VisionError("parse", "분석 결과가 JSON 이 아닙니다");
  }

  const parsed = analyzeResult.safeParse(raw);
  if (!parsed.success) {
    throw new VisionError("parse", `분석 결과가 스키마와 다릅니다 ${parsed.error.message}`);
  }

  return {
    result: parsed.data,
    // ai_model 에 그대로 남아 개발용 응답을 나중에 골라낼 수 있게 함
    model: interaction.model ?? GEMINI_MODEL,
    analyzedAt: new Date(),
  };
}

function toGeminiError(error: unknown): VisionError {
  if (error instanceof VisionError) return error;

  // SDK 가 타임아웃·중단 클래스를 내보내지 않아 이름으로 가름
  if (error instanceof Error && /Timeout|Aborted/.test(error.name)) {
    return new VisionError("timeout", "분석이 제한 시간을 넘겼습니다");
  }
  if (isApiError(error)) {
    if (error.status === 429) {
      return new VisionError("rate-limit", "분석 요청이 한도를 넘었습니다");
    }
    // 서버가 준 사유까지 남김. 이 값은 로그로만 나가고 사용자 응답은 고정 문구를 씀
    return new VisionError("api", `분석 API 오류 ${error.status} ${error.message}`);
  }
  if (error instanceof Error) {
    return new VisionError("api", `분석 API 오류 ${error.message}`);
  }
  return new VisionError("api", "분석을 마치지 못했습니다");
}

function isApiError(error: unknown): error is Error & { status: number } {
  return error instanceof Error && typeof (error as { status?: unknown }).status === "number";
}
