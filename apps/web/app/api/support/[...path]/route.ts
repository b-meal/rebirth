import { createCatchAll } from "@rebirth/core/http";
import { lookupSupportRequestHandler } from "@rebirth/core/support";

// 접수 조회. 조회 토큰을 본문으로 받아 주소창과 로그에 남지 않게 함
export const { POST } = createCatchAll({
  POST: {
    lookup: lookupSupportRequestHandler,
  },
});
