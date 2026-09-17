import { createLostHandler } from "@rebirth/core/matching";

import { getCurrentUser } from "@/lib/auth/session";

// 실종 신고 등록. 후보 조회 규칙이 달라 발견 제보와 경로를 나눔

/** 로그인 상태면 신고를 계정에 묶어 마이페이지에서 모아 볼 수 있게 함 */
export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  return createLostHandler(request, { reporterId: user?.id });
}
