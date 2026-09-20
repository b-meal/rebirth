import "server-only";

import { cache } from "react";

import { findUserProfile, type UserProfile } from "@rebirth/db";
import { logFailure } from "@rebirth/core/http";
import { syncSignedInUser } from "@rebirth/core/auth/sync";

import { isAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// 화면과 라우트가 현재 사용자를 읽는 단일 경로
// proxy 의 판정은 낙관적 차단일 뿐이라 데이터에 가까운 곳에서 다시 확인함

/**
 * 현재 로그인한 사용자. 없으면 undefined
 * cache 로 감싸 한 번의 렌더에서 여러 번 불러도 질의가 한 번만 나감
 *
 * 세션은 있는데 프로필이 없으면 세션 정보로 되살림
 * 콜백은 로그인 순간에만 도는데, 그때 실패했거나 콜백이 없던 시절에 가입한 계정은
 * 프로필 없이 세션만 남아 영영 로그아웃처럼 보임
 */
export const getCurrentUser = cache(
  async (): Promise<UserProfile | undefined> => {
    if (!isAuthConfigured()) return undefined;

    const supabase = await createClient();
    // getClaims 는 쿠키의 서명을 검증하므로 매번 Auth 서버를 부르지 않음
    const { data } = await supabase.auth.getClaims();
    const id = data?.claims?.sub;
    if (!id) return undefined;

    const profile = await findUserProfile(id);
    if (profile) return profile;

    return recoverProfile();
  },
);

/**
 * 프로필이 없는 세션을 되살림
 * getUser 는 Auth 서버를 부르므로 프로필이 없을 때만 씀
 */
async function recoverProfile(): Promise<UserProfile | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return undefined;
  try {
    return await syncSignedInUser(data.user);
  } catch (error) {
    // 프로필을 못 남겨도 화면은 비로그인으로 그림. 여기서 던지면 모든 화면이 함께 죽음
    // 로그인했는데 계속 비로그인으로 보이는 문제가 여기서 조용히 시작됨
    logFailure("auth.recoverProfile", error);
    return undefined;
  }
}
