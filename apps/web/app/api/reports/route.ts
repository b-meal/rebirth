import { createReportHandler, listReportsHandler } from "@rebirth/core/reports";

import { getCurrentUser } from "@/lib/auth/session";

// catch-all 은 빈 경로를 잡지 않으므로 목록과 등록은 여기서 받음

export { listReportsHandler as GET };

/** 로그인 상태면 제보를 계정에 묶어 마이페이지에서 모아 볼 수 있게 함 */
export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  return createReportHandler(request, { reporterId: user?.id });
}
