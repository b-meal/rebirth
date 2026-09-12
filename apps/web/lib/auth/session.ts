import "server-only";

import { cache } from "react";

import { findUserProfile, type UserProfile } from "@rebirth/db";

import { isAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// 화면과 라우트가 현재 사용자를 읽는 단일 경로
// proxy 의 판정은 낙관적 차단일 뿐이라 데이터에 가까운 곳에서 다시 확인함

/**
 * 현재 로그인한 사용자. 없으면 undefined
 * cache 로 감싸 한 번의 렌더에서 여러 번 불러도 질의가 한 번만 나감
 */
export const getCurrentUser = cache(
  async (): Promise<UserProfile | undefined> => {
    if (!isAuthConfigured()) return undefined;

    const supabase = await createClient();
    // getClaims 는 쿠키의 서명을 검증하므로 매번 Auth 서버를 부르지 않음
    const { data } = await supabase.auth.getClaims();
    const id = data?.claims?.sub;
    if (!id) return undefined;

    return findUserProfile(id);
  },
);
