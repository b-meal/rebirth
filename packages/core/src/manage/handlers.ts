import "server-only";

import {
  closeManagedReport,
  findManagedReport,
  findReportByManageTokenHash,
  grantManageAccess,
  listConsentRecords,
  listManagedReports,
  markReportDeleted,
  rotateManageToken,
  updateManagedReport,
} from "@rebirth/db";
import {
  closeReport,
  deleteReport,
  exchangeManageToken,
  recordResolution,
  updateReport,
} from "@rebirth/types";

import {
  MANAGE_COOKIE,
  RATE_LIMITS,
  badRequest,
  checkManageAccess,
  checkRateLimit,
  clearCookie,
  clientKey,
  conflict,
  createManageSession,
  findManageSession,
  forbidden,
  hashToken,
  isUuid,
  issueToken,
  notFound,
  okPrivate,
  parseJson,
  serverError,
  tooManyRequests,
  unauthorized,
  type RouteContext,
} from "../http";

// 익명 관리 권한. 공개 ID 는 열람 식별자일 뿐이고 권한은 관리 세션에서만 나옴
// 관리 주소를 잃으면 이 경로로는 복구할 수 없고 문의 경로로만 처리됨. POL-03

const NEED_AUTH = "관리 주소로 다시 들어와 주십시오";
const NOT_FOUND = "찾는 기록이 없습니다. 관리 주소를 다시 확인해 주십시오";
const VERSION_CONFLICT =
  "다른 곳에서 먼저 수정됐습니다. 최신 내용을 확인한 뒤 다시 저장해 주십시오";

/* POST /api/manage/exchange  관리 토큰을 세션 쿠키로 바꿈 */

export async function exchangeManageTokenHandler(
  request: Request,
): Promise<Response> {
  const limitKey = clientKey(request, "manageExchange");
  const limit = checkRateLimit(limitKey, RATE_LIMITS.manageExchange);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = await parseJson(request, exchangeManageToken);
  if ("response" in parsed) return parsed.response;

  try {
    const report = await findReportByManageTokenHash(
      hashToken(parsed.data.token),
    );
    // 없는 토큰과 만료된 토큰을 구분하지 않음. 대조로 유효한 토큰을 찾지 못하게 함
    if (!report) return notFound(NOT_FOUND);

    // 기존 세션이 있으면 권한만 더함. 여러 기록을 한 세션으로 관리할 수 있음
    const existing = await findManageSession(request);
    if (existing) {
      await grantManageAccess({ sessionId: existing, reportId: report.id });
      return okPrivate({ id: report.id, kind: report.kind });
    }

    const session = await createManageSession();
    await grantManageAccess({ sessionId: session.sessionId, reportId: report.id });

    return okPrivate(
      { id: report.id, kind: report.kind },
      { headers: { "set-cookie": session.setCookie } },
    );
  } catch (error) {
    return serverError("manage.exchange", error);
  }
}

/* POST /api/manage/signout  쿠키만 지움. 토큰은 그대로 유효함 */

export async function signOutManageHandler(
  _request: Request,
): Promise<Response> {
  return okPrivate(
    { signedOut: true },
    { headers: { "set-cookie": clearCookie(MANAGE_COOKIE) } },
  );
}

/* GET /api/manage/reports  이 세션이 관리하는 기록. WEB-16 */

export async function listManagedReportsHandler(
  request: Request,
): Promise<Response> {
  const sessionId = await findManageSession(request);
  if (!sessionId) return unauthorized(NEED_AUTH);

  try {
    const items = await listManagedReports(sessionId);
    return okPrivate({ items });
  } catch (error) {
    return serverError("manage.reports.list", error);
  }
}

/** 권한 확인을 한곳에 둠. 세션 만료와 권한 부족을 구분해 답함. WEB-27 */
async function guard(
  request: Request,
  id: string,
): Promise<Response | null> {
  if (!isUuid(id)) return notFound(NOT_FOUND);

  const access = await checkManageAccess(request, id);
  if (access.ok) return null;
  return access.reason === "no_session"
    ? unauthorized(NEED_AUTH)
    : forbidden("이 기록을 관리할 권한이 없습니다");
}

/* GET /api/manage/reports/[id]  관리 상세. 자기 기록이라도 정확 좌표는 없음 */

export async function getManagedReportHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const denied = await guard(request, id);
  if (denied) return denied;

  try {
    const report = await findManagedReport(id);
    if (!report) return notFound(NOT_FOUND);
    const consents = await listConsentRecords(id);
    return okPrivate({ report, consents });
  } catch (error) {
    return serverError("manage.reports.get", error);
  }
}

/* PATCH /api/manage/reports/[id]  내용 수정. version 으로 낙관적 락 */

export async function updateManagedReportHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const denied = await guard(request, id);
  if (denied) return denied;

  const parsed = await parseJson(request, updateReport);
  if ("response" in parsed) return parsed.response;
  const { version, ...patch } = parsed.data;

  try {
    const row = await updateManagedReport({ reportId: id, version, patch });
    if (!row) {
      // 행이 없어서인지 version 이 어긋나서인지 구분해 답함
      const current = await findManagedReport(id);
      if (!current) return notFound(NOT_FOUND);
      return conflict(VERSION_CONFLICT, { version: current.version });
    }
    return okPrivate(row);
  } catch (error) {
    return serverError("manage.reports.update", error);
  }
}

/* POST /api/manage/reports/[id]/close  종료·찾음. WEB-17 */

export async function closeManagedReportHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const denied = await guard(request, id);
  if (denied) return denied;

  const parsed = await parseJson(request, closeReport);
  if ("response" in parsed) return parsed.response;

  try {
    const current = await findManagedReport(id);
    if (!current) return notFound(NOT_FOUND);

    // 실종 신고의 찾음은 resolved, 나머지 종료는 closed
    const lifecycle =
      current.kind === "lost" && parsed.data.reason === "found"
        ? ("resolved" as const)
        : ("closed" as const);

    const row = await closeManagedReport({
      reportId: id,
      version: parsed.data.version,
      lifecycle,
      closeReason: parsed.data.reason,
      closeNote: parsed.data.note,
    });
    if (!row) return conflict(VERSION_CONFLICT, { version: current.version });

    return okPrivate(row);
  } catch (error) {
    return serverError("manage.reports.close", error);
  }
}

/* DELETE /api/manage/reports/[id]  삭제 요청. 즉시 비공개, 파기는 별도 작업 */

export async function deleteManagedReportHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const denied = await guard(request, id);
  if (denied) return denied;

  // 되돌릴 수 없는 동작이라 version 을 본문으로 받아 화면이 본 값과 맞는지 확인
  const parsed = await parseJson(request, deleteReport);
  if ("response" in parsed) return parsed.response;

  try {
    const current = await findManagedReport(id);
    if (!current) return notFound(NOT_FOUND);

    const row = await markReportDeleted({
      reportId: id,
      version: parsed.data.version,
    });
    if (!row) return conflict(VERSION_CONFLICT, { version: current.version });

    // 공개 중단만 즉시 반영. 실제 파기 완료는 별도로 추적함. POL-21
    return okPrivate({ ...row, visibility: "deleted", purgeScheduled: true });
  } catch (error) {
    return serverError("manage.reports.delete", error);
  }
}

/* POST /api/manage/reports/[id]/rotate  관리 주소 재발급. 이전 권한을 모두 끊음 */

export async function rotateManageTokenHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const denied = await guard(request, id);
  if (denied) return denied;

  const limit = checkRateLimit(
    clientKey(request, "manageExchange"),
    RATE_LIMITS.manageExchange,
  );
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const token = issueToken();
    const row = await rotateManageToken({
      reportId: id,
      tokenHash: hashToken(token),
    });
    if (!row) return notFound(NOT_FOUND);

    // 회전으로 이 세션의 권한도 끊겼으므로 새 토큰으로 다시 교환하게 함
    const session = await createManageSession();
    await grantManageAccess({ sessionId: session.sessionId, reportId: id });

    return okPrivate(
      { id: row.id, manageToken: token },
      { headers: { "set-cookie": session.setCookie } },
    );
  } catch (error) {
    return serverError("manage.reports.rotate", error);
  }
}

/* POST /api/manage/reports/[id]/resolution  후속 상태 기록. WEB-32 */

export async function recordResolutionHandler(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const denied = await guard(request, id);
  if (denied) return denied;

  const parsed = await parseJson(request, recordResolution);
  if ("response" in parsed) return parsed.response;

  try {
    const current = await findManagedReport(id);
    if (!current) return notFound(NOT_FOUND);

    // 찾음 확인만 lifecycle 을 옮김. 다른 응답은 기록만 남기고 상태를 바꾸지 않음
    // 한쪽 진술로 상대 기록을 종료하지 않음. POL-06
    if (parsed.data.status !== "found") {
      const row = await updateManagedReport({
        reportId: id,
        version: parsed.data.version,
        patch: { closeNote: parsed.data.note },
      });
      if (!row) return conflict(VERSION_CONFLICT, { version: current.version });
      return okPrivate({ ...row, recorded: parsed.data.status });
    }

    const row = await closeManagedReport({
      reportId: id,
      version: parsed.data.version,
      lifecycle: current.kind === "lost" ? "resolved" : "closed",
      closeReason: "found",
      closeNote: parsed.data.note,
    });
    if (!row) return conflict(VERSION_CONFLICT, { version: current.version });
    return okPrivate({ ...row, recorded: parsed.data.status });
  } catch (error) {
    return serverError("manage.reports.resolution", error);
  }
}

export { NEED_AUTH, NOT_FOUND as MANAGE_NOT_FOUND };
