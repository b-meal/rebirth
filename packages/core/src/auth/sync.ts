import "server-only";

import { upsertUserProfile, type UserProfile } from "@rebirth/db";

import { toIdentity, type SupabaseUserLike } from "./identity";

// 로그인 성공 후 프로필을 남김. 신원 확인은 Supabase Auth 가 끝낸 뒤에 호출됨

/**
 * 로그인한 사용자의 프로필을 기록하고 돌려줌
 * 지원하지 않는 제공자로 들어왔으면 undefined. 호출자가 로그인을 실패로 처리함
 */
export async function syncSignedInUser(
  user: SupabaseUserLike,
): Promise<UserProfile | undefined> {
  const identity = toIdentity(user);
  if (!identity) return undefined;
  return upsertUserProfile(identity);
}
