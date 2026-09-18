import { resolveLocationHandler, createUploadHandler } from "@rebirth/core/drafts";
import { createCatchAll } from "@rebirth/core/http";
import {
  analyzeHandler,
  getAnalysisJobHandler,
  precheckHandler,
  precheckLogHandler,
} from "@rebirth/core/vision";

// 제출 전 임시 자료. 사진, 위치, AI 초안이 모두 초안 세션 쿠키에 묶임
export const { GET, POST } = createCatchAll({
  GET: {
    "analyze/:id": getAnalysisJobHandler,
  },
  POST: {
    uploads: createUploadHandler,
    "location/resolve": resolveLocationHandler,
    analyze: analyzeHandler,
    // 사진을 확정하기 전 1단계에서 부름. 저장소를 거치지 않아 세션도 필요 없음
    precheck: precheckHandler,
    // 그 판정이 무엇이었는지만 받아 적음. 사진도 세션도 받지 않음
    "precheck/log": precheckLogHandler,
  },
});
