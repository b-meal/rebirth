import { createCatchAll, type RouteContext } from "@rebirth/core/http";
import {
  createCommentHandler,
  createFlagHandler,
  getReportHandler,
  getReportPhotoHandler,
  shareReportHandler,
  toggleInterestHandler,
} from "@rebirth/core/reports";

import { getCurrentUser } from "@/lib/auth/session";

// 공개 제보 상세와 부수 동작. 함수 하나로 묶어 배포 함수 수를 아낌

/** 관심은 로그인 상태면 계정도 함께 남겨 마이페이지에서 모아 봄 */
async function interest(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser();
  return toggleInterestHandler(request, context, { userId: user?.id });
}

export const { GET, POST } = createCatchAll({
  GET: {
    ":id": getReportHandler,
    ":id/photo": getReportPhotoHandler,
  },
  POST: {
    ":id/comments": createCommentHandler,
    ":id/flag": createFlagHandler,
    ":id/interest": interest,
    ":id/share": shareReportHandler,
  },
});
