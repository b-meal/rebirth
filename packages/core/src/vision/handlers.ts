import "server-only";

import {
  finishAnalysisJob,
  findAnalysisJob,
  findAnalysisJobByUpload,
  findUsableUploads,
  insertAnalysisJob,
} from "@rebirth/db";
import { z } from "zod";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  findDraftSession,
  isUuid,
  notFound,
  okPrivate,
  parseJson,
  peekRateLimit,
  serverError,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
  type RouteContext,
} from "../http";
import { downloadPhoto } from "../storage";
import { VisionError, analyzePhoto } from "./analyze";
import { ANALYZE_FAILED_MESSAGE, adviseFromResult } from "./guidance";

// AI 초안. 이미 올린 사진을 uploadId 로 지목해 분석함
// 브라우저가 사진을 두 번 올리지 않고, 세션 밖 사진은 분석 대상이 되지 않음

const NO_SESSION = "사진을 다시 올려 주십시오. 작성 중이던 정보가 만료됐습니다";
const NO_UPLOAD = "분석할 사진을 찾을 수 없습니다. 사진을 다시 올려 주십시오";

// 모델이 받지 못하는 형식. 저장은 되지만 분석은 건너뛰고 직접 입력으로 돌림
const MODEL_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const requestAnalysis = z.object({
  uploadId: z.uuid("사진 참조가 올바르지 않습니다"),
});

/* POST /api/draft/analyze  올린 사진의 초안을 만듦 */

export async function analyzeHandler(request: Request): Promise<Response> {
  const limitKey = clientKey(request, "analyze");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.analyze);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  const parsed = await parseJson(request, requestAnalysis);
  if ("response" in parsed) return parsed.response;

  const sessionId = await findDraftSession(request);
  if (!sessionId) return unauthorized(NO_SESSION);

  try {
    const [upload] = await findUsableUploads({
      sessionId,
      ids: [parsed.data.uploadId],
    });
    if (!upload?.storagePath) return notFound(NO_UPLOAD);

    // 같은 사진의 같은 revision 은 다시 분석하지 않고 기존 작업을 돌려줌
    const existing = await findAnalysisJobByUpload({
      sessionId,
      uploadId: upload.id,
      revision: upload.revision,
    });
    if (existing) return okPrivate(toJobBody(existing));

    if (
      !MODEL_MEDIA_TYPES.includes(
        upload.contentType as (typeof MODEL_MEDIA_TYPES)[number],
      )
    ) {
      // HEIC 는 저장은 되지만 모델에 넣지 못함. 실패가 아니라 직접 입력 안내
      return serviceUnavailable(
        "이 형식은 AI 초안을 만들 수 없습니다. 직접 입력해 주십시오",
      );
    }

    const limit = checkRateLimit(limitKey, RATE_LIMITS.analyze);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const job = await insertAnalysisJob({
      sessionId,
      uploadId: upload.id,
      revision: upload.revision,
    });
    // onConflictDoNothing 이라 경쟁 요청이 이미 만들었을 수 있음
    if (!job) {
      const raced = await findAnalysisJobByUpload({
        sessionId,
        uploadId: upload.id,
        revision: upload.revision,
      });
      if (raced) return okPrivate(toJobBody(raced));
      return serverError("analyze.job", new Error("작업 행을 만들지 못했습니다"));
    }

    const startedAt = Date.now();
    try {
      const file = await downloadPhoto(upload.storagePath);
      const outcome = await analyzePhoto({
        base64: Buffer.from(file.body).toString("base64"),
        mediaType: upload.contentType ?? file.contentType,
      });
      const advice = adviseFromResult(outcome.result);

      await finishAnalysisJob({
        id: job.id,
        status: "succeeded",
        result: outcome.result,
        model: outcome.model,
        latencyMs: Date.now() - startedAt,
      });

      return okPrivate({
        jobId: job.id,
        status: "succeeded",
        uploadId: upload.id,
        revision: upload.revision,
        // confidence 는 화면에 쓰지 않고 지표 저장용으로만 내려보냄
        draft: outcome.result,
        advice: advice.state,
        message: advice.message,
        model: outcome.model,
        analyzedAt: outcome.analyzedAt.toISOString(),
      });
    } catch (error) {
      const kind = error instanceof VisionError ? error.kind : "api";
      await finishAnalysisJob({
        id: job.id,
        status: "failed",
        failureCode: kind,
        latencyMs: Date.now() - startedAt,
      }).catch(() => undefined);

      if (error instanceof VisionError) {
        // 실패는 정상 경로. 화면은 빈 폼을 열어 직접 입력을 받음
        console.error(`[analyze] ${error.kind} ${error.message}`);
        return okPrivate(
          {
            jobId: job.id,
            status: "failed",
            uploadId: upload.id,
            revision: upload.revision,
            advice: "failed",
            message: ANALYZE_FAILED_MESSAGE,
            reason: error.kind,
          },
          { status: 200 },
        );
      }
      return serverError("analyze", error);
    }
  } catch (error) {
    return serverError("analyze", error);
  }
}

/* GET /api/draft/analyze/[id]  작업 결과 재조회. 화면 복귀와 재시도용 */

export async function getAnalysisJobHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  if (!isUuid(id)) return badRequest("작업 참조가 올바르지 않습니다");

  const sessionId = await findDraftSession(request);
  if (!sessionId) return unauthorized(NO_SESSION);

  try {
    const job = await findAnalysisJob({ sessionId, id });
    if (!job) return notFound("분석 작업을 찾을 수 없습니다");
    return okPrivate(toJobBody(job));
  } catch (error) {
    return serverError("analyze.get", error);
  }
}

function toJobBody(job: {
  id: string;
  status: string;
  uploadId: string;
  revision: number;
  result: unknown;
  failureCode: string | null;
  model: string | null;
  finishedAt: Date | null;
}) {
  const advice =
    job.status === "succeeded" && job.result
      ? adviseFromResult(job.result as never)
      : undefined;

  return {
    jobId: job.id,
    status: job.status,
    uploadId: job.uploadId,
    revision: job.revision,
    ...(job.status === "succeeded" && { draft: job.result }),
    ...(advice && { advice: advice.state, message: advice.message }),
    ...(job.status === "failed" && {
      advice: "failed",
      message: ANALYZE_FAILED_MESSAGE,
      reason: job.failureCode ?? undefined,
    }),
    model: job.model ?? undefined,
    analyzedAt: job.finishedAt?.toISOString(),
  };
}
