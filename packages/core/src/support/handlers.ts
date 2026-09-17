import "server-only";

import {
  findPublishedLegalDocument,
  findSupportRequestByTokenHash,
  insertSupportRequest,
  listLegalDocumentVersions,
} from "@rebirth/db";
import {
  createSupportRequest,
  legalDocType,
  looksLikeToken,
} from "@rebirth/types";
import { z } from "zod";

import {
  RATE_LIMITS,
  badRequest,
  checkRateLimit,
  clientKey,
  hashToken,
  issueReference,
  issueToken,
  notFound,
  ok,
  okPrivate,
  parseJson,
  peekRateLimit,
  serverError,
  tooManyRequests,
  type RouteContext,
} from "../http";

// 문의·권리 요청과 법적 고지
// 관리 주소를 잃은 사람도 접수할 수 있어 관리 권한을 요구하지 않음. WEB-24

/* POST /api/support  문의 접수. 조회 토큰을 한 번만 돌려줌 */

export async function createSupportRequestHandler(
  request: Request,
): Promise<Response> {
  const limitKey = clientKey(request, "support");
  const peeked = peekRateLimit(limitKey, RATE_LIMITS.support);
  if (!peeked.allowed) return tooManyRequests(peeked.retryAfterSeconds);

  const parsed = await parseJson(request, createSupportRequest);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  // 관리 토큰을 실수로 붙여넣으면 저장하지 않고 되돌려보냄
  if (looksLikeToken(input.body)) {
    return badRequest("관리 주소는 본문에 적지 말아 주십시오", {
      body: "관리 주소가 섞여 있습니다. 어떤 도움이 필요한지만 적어 주십시오",
    });
  }

  const limit = checkRateLimit(limitKey, RATE_LIMITS.support);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const token = issueToken();
    const row = await insertSupportRequest({
      kind: input.kind,
      body: input.body,
      relatedReportId: input.relatedReportId,
      reference: issueReference("SR"),
      tokenHash: hashToken(token),
    });

    return okPrivate(
      {
        reference: row.reference,
        // 조회 토큰은 이 응답에서 한 번만 나감
        lookupToken: token,
        receivedAt: row.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return serverError("support.create", error);
  }
}

/* POST /api/support/lookup  접수 상태와 공개 답변 조회. 내부 메모는 나오지 않음 */

const lookupSupport = z.object({
  token: z
    .string()
    .trim()
    .min(20, "조회 주소가 올바르지 않습니다")
    .max(200, "조회 주소가 올바르지 않습니다"),
});

export async function lookupSupportRequestHandler(
  request: Request,
): Promise<Response> {
  const limit = checkRateLimit(
    clientKey(request, "support"),
    RATE_LIMITS.support,
  );
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = await parseJson(request, lookupSupport);
  if ("response" in parsed) return parsed.response;

  try {
    const found = await findSupportRequestByTokenHash(
      hashToken(parsed.data.token),
    );
    if (!found) return notFound("접수 내역을 찾을 수 없습니다");
    return okPrivate(found);
  } catch (error) {
    return serverError("support.lookup", error);
  }
}

/* GET /api/legal/[docType]  현재 발행본. WEB-22, WEB-23 */

export async function getLegalDocumentHandler(
  request: Request,
  context: RouteContext<{ docType: string }>,
): Promise<Response> {
  const { docType } = await context.params;
  const parsed = legalDocType.safeParse(docType);
  if (!parsed.success) return notFound("문서를 찾을 수 없습니다");

  try {
    // 이력 요청은 발행된 버전 목록만 돌려줌
    if (new URL(request.url).searchParams.get("history") === "1") {
      const versions = await listLegalDocumentVersions(parsed.data);
      return ok({ docType: parsed.data, versions });
    }

    const document = await findPublishedLegalDocument(parsed.data);
    if (!document) return notFound("아직 발행되지 않은 문서입니다");

    return ok(document, {
      // 법적 고지는 자주 바뀌지 않아 짧게 캐시. 개정은 시행일로 반영됨
      headers: { "cache-control": "public, max-age=300, must-revalidate" },
    });
  } catch (error) {
    return serverError("legal.get", error);
  }
}
