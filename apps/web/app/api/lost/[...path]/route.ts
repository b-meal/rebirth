import { createCatchAll } from "@rebirth/core/http";
import {
  getLostCandidatesHandler,
  getLostMatchesHandler,
} from "@rebirth/core/matching";

// 확인할 후보 조회. 개체 동일성 확정이 아니라 유사도이며 작성자만 봄
export const { GET } = createCatchAll({
  GET: {
    ":id/candidates": getLostCandidatesHandler,
    ":id/matches": getLostMatchesHandler,
  },
});
