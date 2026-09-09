import { resolveLocationHandler, createUploadHandler } from "@rebirth/core/drafts";
import { createCatchAll } from "@rebirth/core/http";
import { analyzeHandler, getAnalysisJobHandler } from "@rebirth/core/vision";

// 제출 전 임시 자료. 사진·위치·AI 초안이 모두 초안 세션 쿠키에 묶임
export const { GET, POST } = createCatchAll({
  GET: {
    "analyze/:id": getAnalysisJobHandler,
  },
  POST: {
    uploads: createUploadHandler,
    "location/resolve": resolveLocationHandler,
    analyze: analyzeHandler,
  },
});
