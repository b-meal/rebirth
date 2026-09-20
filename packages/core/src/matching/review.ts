import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { promptTime } from "./prompt-time.ts";

// 결정식 배점이 올린 후보를 모델이 다시 읽고 근거 문장을 만듦
// 배점은 왜 위에 있는지 말해 주지 않음. 사람이 사진을 열기 전에 읽을 한 문단이 필요함
// 개체 동일성은 어떤 경우에도 확정하지 않고 확인할 값어치만 말함

export const REVIEW_MODEL = "claude-sonnet-5";
export const REVIEW_TIMEOUT_MS = 20_000;
export const REVIEW_PROMPT_VERSION = "review-1";

export const matchVerdict = z.enum(["worth_checking", "unlikely", "insufficient"]);

export const MATCH_VERDICT_LABEL: Record<z.infer<typeof matchVerdict>, string> = {
  worth_checking: "확인할 값어치 있음",
  unlikely: "겹치지 않는 점이 많음",
  insufficient: "판단할 근거가 부족함",
};

export const matchReview = z.object({
  verdict: matchVerdict,
  // 사람이 사진을 열기 전에 읽을 문장. 겹치는 점과 어긋나는 점을 나눠 적음
  agreements: z.array(z.string()).max(5),
  conflicts: z.array(z.string()).max(5),
  // 연락 전에 확인할 것 하나. 없으면 null
  checkFirst: z.string().nullable(),
});

export type MatchReview = z.infer<typeof matchReview>;

export type ReviewSubject = {
  animalType: string;
  breedGuess: string | null;
  colors: string[];
  size: string;
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  conditionTags: string[];
  appearance: string | null;
  areaName: string | null;
  occurredAt: Date;
};

export type ReviewInput = {
  lost: ReviewSubject;
  sighting: ReviewSubject;
  /** 결정식 배점 결과. 모델이 점수를 다시 만들지 않고 근거만 씀 */
  score: number;
  distanceKm: number | null;
  hoursApart: number;
};

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly kind: "no-config" | "timeout" | "rate-limit" | "api" | "parse",
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

const SYSTEM = `당신은 실종 신고와 발견 제보를 나란히 읽고, 보호자가 사진을 열어 볼 값어치가 있는지 정리합니다.

원칙
- 같은 개체라고 확정하지 않습니다. 확인할 후보인지만 말합니다
- 주어진 값에 없는 사실을 만들지 않습니다. 나이, 성격, 건강 상태, 유기 여부를 추측하지 않습니다
- 품종을 단정하지 않습니다. 품종은 계열 추정으로만 다룹니다
- 점수를 다시 매기지 않습니다. 점수는 이미 정해져 있고 당신은 근거만 적습니다
- agreements 는 두 기록에서 실제로 겹치는 값만 적습니다
- conflicts 는 서로 어긋나는 값만 적습니다. 한쪽이 비어 있으면 어긋남이 아니라 근거 부족입니다
- 겹치는 값도 어긋나는 값도 거의 없으면 verdict 를 insufficient 로 둡니다
- 모든 문장은 한국어로 쓰고 명사형으로 끝냅니다. 한 문장은 40자를 넘기지 않습니다`;

function describe(subject: ReviewSubject, label: string): string {
  const tri = (value: boolean | null) =>
    value === null ? "모름" : value ? "있음" : "없음";
  return [
    `[${label}]`,
    `종류: ${subject.animalType}`,
    `품종 추정: ${subject.breedGuess ?? "없음"}`,
    `털색: ${subject.colors.join(", ") || "미기재"}`,
    `크기: ${subject.size}`,
    `목줄: ${tri(subject.collar)}`,
    `부상: ${tri(subject.injury)}`,
    `귀 끝: ${tri(subject.earTip)}`,
    `상태 표시: ${subject.conditionTags.join(", ") || "없음"}`,
    `지역: ${subject.areaName ?? "미확인"}`,
    `시각: ${promptTime(subject.occurredAt)}`,
    `설명: ${subject.appearance ?? "없음"}`,
  ].join("\n");
}

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ReviewError("ANTHROPIC_API_KEY 가 없습니다", "no-config");
  cached = new Anthropic({ apiKey, maxRetries: 1 });
  return cached;
}

/** 후보 한 쌍을 모델이 읽고 근거를 만듦. 실패는 ReviewError 로 던져 호출부가 정함 */
export async function reviewMatch(input: ReviewInput): Promise<{
  review: MatchReview;
  model: string;
}> {
  const facts = [
    describe(input.lost, "실종 신고"),
    describe(input.sighting, "발견 제보"),
    [
      "[계산된 값]",
      `유사도 점수: ${input.score}/100`,
      `거리: ${input.distanceKm === null ? "좌표 없음" : `${input.distanceKm.toFixed(1)}km`}`,
      `시간 차이: ${Math.round(input.hoursApart)}시간`,
    ].join("\n"),
  ].join("\n\n");

  let response;
  try {
    response = await client().messages.parse(
      {
        model: REVIEW_MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `${facts}\n\n두 기록을 대조해 확인할 값어치를 정리해 주십시오.`,
          },
        ],
        output_config: { format: zodOutputFormat(matchReview) },
      },
      { timeout: REVIEW_TIMEOUT_MS },
    );
  } catch (error) {
    throw toReviewError(error);
  }

  if (response.stop_reason === "refusal") {
    throw new ReviewError("안전 정책으로 재평가가 거절됐습니다", "api");
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new ReviewError("재평가 결과를 스키마로 읽지 못했습니다", "parse");

  return { review: parsed, model: response.model };
}

function toReviewError(error: unknown): ReviewError {
  if (error instanceof ReviewError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new ReviewError("재평가가 제한 시간을 넘겼습니다", "timeout");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ReviewError("재평가 요청이 한도를 넘었습니다", "rate-limit");
  }
  if (error instanceof Anthropic.APIError) {
    return new ReviewError(`재평가 API 오류 ${error.message}`, "api");
  }
  return new ReviewError("재평가를 마치지 못했습니다", "api");
}
