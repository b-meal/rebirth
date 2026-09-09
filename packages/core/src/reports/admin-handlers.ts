import "server-only";

import {
  countEditedFields,
  findAdminReport,
  listAdminReports,
  listPendingFlags,
  resolveFlags,
} from "@rebirth/db";
import { adminReportQuery, moderationDecision } from "@rebirth/types";

import {
  badRequest,
  fieldErrors,
  isUuid,
  notFound,
  ok,
  parseJson,
  serverError,
  unauthorized,
  type RouteContext,
} from "../http";

// 운영 API. 좌표는 운영 화면에도 내주지 않고 서버에서만 읽음
// 인증은 P0 기간에 공유 토큰 한 겹. 계정과 역할은 P1

const ADMIN_HEADER = "x-admin-token";

/**
 * 운영 토큰 확인. 토큰이 설정되지 않은 환경에서는 전부 거절해
 * 실수로 공개된 배포가 열려 있는 상태를 만들지 않음
 */
export function requireAdmin(request: Request): Response | null {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    console.error("[admin] ADMIN_API_TOKEN 이 설정되지 않아 요청을 거절함");
    return unauthorized("운영 API 가 설정되지 않았습니다");
  }

  const provided = request.headers.get(ADMIN_HEADER);
  if (!provided || !timingSafeEqual(provided, expected)) {
    return unauthorized();
  }
  return null;
}

// 길이와 내용 비교 시간을 입력에 따라 달라지지 않게 함
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* GET /api/admin/reports  제보 목록. 상태와 지역, 신고 여부로 추림 */

export async function adminListReportsHandler(
  request: Request,
): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = adminReportQuery.safeParse(query);
  if (!parsed.success) {
    return badRequest("조회 조건을 확인해 주십시오", fieldErrors(parsed.error));
  }

  const { kind, visibility, lifecycle, areaCode, flagged, limit, offset } =
    parsed.data;

  try {
    const items = await listAdminReports({
      kind,
      visibility,
      lifecycle,
      areaCode,
      flaggedOnly: flagged,
      limit,
      offset,
    });
    return ok({ items, limit, offset });
  } catch (error) {
    return serverError("admin.reports.list", error);
  }
}

/* GET /api/admin/reports/[id]  상세. AI 초안과 사용자 수정 필드, 신고 내역 포함 */

export async function adminGetReportHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;
  if (!isUuid(id)) return notFound("찾는 제보가 없습니다");

  try {
    const report = await findAdminReport(id);
    if (!report) return notFound("찾는 제보가 없습니다");
    return ok(report);
  } catch (error) {
    return serverError("admin.reports.get", error);
  }
}

/* GET /api/admin/moderation  검수 대기 목록. 미판정 신고가 쌓인 제보 */

export async function adminModerationQueueHandler(
  request: Request,
): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const items = await listPendingFlags();
    return ok({ items });
  } catch (error) {
    return serverError("admin.moderation.queue", error);
  }
}

/* POST /api/admin/reports/[id]/moderation  판정. status 와 신고를 함께 닫음 */

export async function adminModerateHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;
  if (!isUuid(id)) return notFound("찾는 제보가 없습니다");

  const parsed = await parseJson(request, moderationDecision);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await resolveFlags({
      reportId: id,
      decision: parsed.data.decision,
      note: parsed.data.note,
    });
    if (!result) return notFound("찾는 제보가 없습니다");
    return ok(result);
  } catch (error) {
    return serverError("admin.moderation.decide", error);
  }
}

/* GET /api/admin/metrics  AI 초안 수정 필드 집계 */

export async function adminMetricsHandler(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const editedFields = await countEditedFields();
    return ok({ editedFields });
  } catch (error) {
    return serverError("admin.metrics", error);
  }
}
