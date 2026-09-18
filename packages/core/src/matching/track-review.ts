import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { promptTime } from "./prompt-time.ts";

/**
 * 이동 경로와 노드 사진을 모델이 읽고 먼저 가 볼 순서를 적음
 * 배점과 예측은 결정식이 이미 끝냈고 여기서는 읽는 법만 만듦
 * server-only 를 붙이지 않는 이유는 스키마와 프롬프트를 테스트에서 그대로 읽기 위함
 */

export const TRACK_MODEL = "claude-sonnet-5";
export const TRACK_TIMEOUT_MS = 20_000;
export const TRACK_PROMPT_VERSION = "track-1";

// 최근 노드부터 한 장씩 넣는 한 요청 사진 상한
export const TRACK_PHOTO_MAX = 4;

export const trackReview = z.object({
  // 경로가 어느 쪽으로 이어졌는지 한 문장
  movement: z.string(),
  // 사진끼리 눈에 보이는 특징이 어긋나는지만 보는 값
  photoConsistency: z.enum(["consistent", "mixed", "unclear"]),
  searchOrder: z.array(z.string()).max(3),
  caution: z.string().nullable(),
});

export type TrackReview = z.infer<typeof trackReview>;

export type TrackReviewNode = {
  reportId: string;
  areaName: string | null;
  occurredAt: Date;
};

export type TrackReviewInput = {
  nodes: TrackReviewNode[];
  /** buildTrack 이 낸 경로 신뢰도. 모델이 다시 매기지 않음 */
  confidence: number;
  /** predictNext 결과. 좌표는 받지 않고 방향과 반경만 받음 */
  prediction: {
    radiusKm: number;
    straightness: number;
    hoursSinceLast: number;
    bearingDeg: number;
  } | null;
  /** 규칙이 이미 센 탐색 단계와 주변 제보 수. 모델은 이 숫자만 인용하고 다시 세지 않음 */
  situation?: TrackSituation | null;
};

export type TrackSituation = {
  phase: "fresh" | "recent" | "stale" | "cold";
  hoursSinceLost: number;
  radiusKm: number;
  around: { sightings: number; candidates: number } | null;
  coverage: "quiet" | "active" | null;
};

const PHASE_WORD: Record<TrackSituation["phase"], string> = {
  fresh: "직후",
  recent: "하루 안",
  stale: "사흘 안",
  cold: "사흘 넘음",
};

export type TrackReviewErrorKind =
  | "no-config"
  | "timeout"
  | "rate-limit"
  | "api"
  | "parse";

export class TrackReviewError extends Error {
  readonly kind: TrackReviewErrorKind;

  // 생성자 파라미터 프로퍼티는 node strip-only 모드에서 불가
  constructor(message: string, kind: TrackReviewErrorKind) {
    super(message);
    this.name = "TrackReviewError";
    this.kind = kind;
  }
}

export const SYSTEM = `당신은 목격 제보를 이은 이동 경로와 노드 사진을 읽고, 보호자가 어디부터 찾아볼지 정리합니다.

원칙
- 같은 개체라고 말하지 않습니다. 모든 결과는 확인할 후보입니다
- 품종을 단정하지 않습니다. 품종은 계열 추정으로만 다룹니다
- 점수를 다시 매기지 않습니다. 경로 신뢰도는 이미 정해져 있고 당신은 읽는 법만 적습니다
- 사진은 털색, 크기, 목줄 같은 눈에 보이는 특징이 서로 어긋나는지만 봅니다. 사진을 근거로 같은 개체라고 말하지 않습니다
- 좌표 숫자를 쓰지 않습니다. 위치는 지역명과 방향 낱말로만 말합니다
- 주어진 값에 없는 사실을 만들지 않습니다. 목격 시각과 지역명 밖의 일을 추측하지 않습니다
- 숫자는 주어진 값만 인용합니다. 제보 수와 후보 수와 반경을 다시 세거나 어림하지 않습니다
- 주변 상황이 주어지면 그 위에서 읽습니다. 제보가 없는 곳과 제보는 있는데 후보가 없는 곳은 다르게 말합니다
- movement 는 경로가 어느 쪽으로 이어졌는지 한 문장으로 적습니다
- searchOrder 는 먼저 가 볼 곳을 최대 세 개까지, 앞에 올수록 먼저 가 볼 곳으로 적습니다
- caution 은 경로를 읽을 때 주의할 점 하나이고 없으면 null 로 둡니다
- 모든 문장은 한국어로 쓰고 명사형으로 끝냅니다. 한 문장은 40자를 넘기지 않습니다`;

const BEARING_WORDS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"] as const;

/** 방위각을 여덟 방향 낱말로 옮김. 프롬프트에 각도 숫자를 넣지 않기 위함 */
export function bearingWord(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  return BEARING_WORDS[Math.round(normalized / 45) % 8]!;
}

/** 경로를 모델이 읽을 문장으로 옮김. 좌표는 어떤 형태로도 담지 않음 */
export function describeTrack(input: TrackReviewInput): string {
  const nodes = input.nodes.map(
    (node, index) =>
      `${index + 1}. ${node.areaName ?? "지역 미확인"} · ${promptTime(node.occurredAt)}`,
  );

  const prediction = input.prediction
    ? [
        `마지막 이동 방향: ${bearingWord(input.prediction.bearingDeg)}쪽`,
        `방향 일관성: ${input.prediction.straightness.toFixed(2)} (1 이면 한 방향 직선)`,
        `마지막 목격 이후: ${Math.round(input.prediction.hoursSinceLast)}시간`,
        `탐색 반경: ${input.prediction.radiusKm.toFixed(1)}km`,
      ]
    : ["예측 없음"];

  const situation = input.situation ? describeSituation(input.situation) : [];

  return [
    "[이동 경로]",
    ...nodes,
    `경로 신뢰도: ${Math.round(input.confidence)}/100`,
    "",
    "[다음 목격 예측]",
    ...prediction,
    ...(situation.length > 0 ? ["", "[주변 상황]", ...situation] : []),
  ].join("\n");
}

/** 규칙이 센 숫자를 그대로 적음. 실종 시각 기준이며 후보 시각을 기준으로 삼지 않음 */
function describeSituation(situation: TrackSituation): string[] {
  const lines = [
    `실종 이후: ${Math.round(situation.hoursSinceLost)}시간 (${PHASE_WORD[situation.phase]})`,
  ];
  if (situation.around) {
    lines.push(
      `반경 ${situation.radiusKm.toFixed(1)}km 안 발견 제보 ${situation.around.sightings}건, 그중 닮은 후보 ${situation.around.candidates}건`,
    );
  }
  if (situation.coverage) {
    lines.push(
      situation.coverage === "quiet"
        ? "주변 제보 활동: 적음 (보는 눈이 적은 곳)"
        : "주변 제보 활동: 있음",
    );
  }
  return lines;
}

const PHOTO_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type PhotoMediaType = (typeof PHOTO_MEDIA_TYPES)[number];

// 알 수 없는 형식은 jpeg 로 보내 사진 한 장 때문에 해석 전체가 멈추는 것 방지
function mediaType(value: string): PhotoMediaType {
  const bare = value.split(";")[0]!.trim();
  return (PHOTO_MEDIA_TYPES as readonly string[]).includes(bare)
    ? (bare as PhotoMediaType)
    : "image/jpeg";
}

export type TrackPhotoBlock = {
  type: "image";
  source: { type: "base64"; media_type: PhotoMediaType; data: string };
};

/** 노드 사진을 최근부터 모아 이미지 블록으로 만듦. 없으면 빈 배열로 텍스트만 씀 */
export async function loadTrackPhotos(
  nodes: TrackReviewNode[],
): Promise<TrackPhotoBlock[]> {
  if (nodes.length === 0) return [];
  // server-only 모듈이라 호출 시점 로드
  const { findFirstPhotoPaths } = await import("@rebirth/db");
  const { downloadPhoto } = await import("../storage/supabase-storage.ts");

  const recent = [...nodes].reverse();
  const paths = await findFirstPhotoPaths(recent.map((node) => node.reportId));
  const picked = recent
    .map((node) => paths.get(node.reportId))
    .filter((path): path is string => Boolean(path))
    .slice(0, TRACK_PHOTO_MAX);

  const settled = await Promise.allSettled(picked.map((path) => downloadPhoto(path)));
  return settled.flatMap((result) =>
    result.status === "fulfilled"
      ? [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType(result.value.contentType),
              data: Buffer.from(result.value.body).toString("base64"),
            },
          },
        ]
      : [],
  );
}

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new TrackReviewError("ANTHROPIC_API_KEY 가 없습니다", "no-config");
  cached = new Anthropic({ apiKey, maxRetries: 1 });
  return cached;
}

/** 경로 하나를 모델이 읽고 탐색 순서를 만듦. 실패는 TrackReviewError 로 던져 호출부가 정함 */
export async function reviewTrack(input: TrackReviewInput): Promise<{
  review: TrackReview;
  model: string;
}> {
  // 키 확인이 뒤로 가면 사진 다운로드가 통째로 헛돌아 먼저 만듦
  const anthropic = client();
  // 사진을 못 읽어도 경로 문장만으로 해석 가능
  const photoBlocks = await loadTrackPhotos(input.nodes).catch(() => []);

  let response;
  try {
    response = await anthropic.messages.parse(
      {
        model: TRACK_MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              ...photoBlocks,
              {
                type: "text" as const,
                text: `${describeTrack(input)}\n\n사진 ${photoBlocks.length}장은 위 경로의 최근 목격부터 순서대로입니다.\n경로를 읽고 먼저 가 볼 순서를 정리해 주십시오.`,
              },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(trackReview) },
      },
      { timeout: TRACK_TIMEOUT_MS },
    );
  } catch (error) {
    throw toTrackReviewError(error);
  }

  if (response.stop_reason === "refusal") {
    throw new TrackReviewError("안전 정책으로 경로 해석이 거절됐습니다", "api");
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new TrackReviewError("경로 해석 결과를 스키마로 읽지 못했습니다", "parse");

  return { review: parsed, model: response.model };
}

function toTrackReviewError(error: unknown): TrackReviewError {
  if (error instanceof TrackReviewError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new TrackReviewError("경로 해석이 제한 시간을 넘겼습니다", "timeout");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new TrackReviewError("경로 해석 요청이 한도를 넘었습니다", "rate-limit");
  }
  if (error instanceof Anthropic.APIError) {
    return new TrackReviewError(`경로 해석 API 오류 ${error.message}`, "api");
  }
  return new TrackReviewError("경로 해석을 마치지 못했습니다", "api");
}
