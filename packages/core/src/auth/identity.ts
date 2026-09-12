import { authProvider, type AuthProvider } from "@rebirth/types";

// Supabase 사용자에서 서비스가 쓸 표시 정보만 뽑음
// 제공자마다 metadata 키가 달라 그 차이를 이 파일 하나에 가둠
// server-only 를 import 하지 않음. 순수 변환이라 단위 테스트에서 그대로 돎

/** Supabase user 중 우리가 읽는 부분만. SDK 타입에 묶이지 않게 좁혀 받음 */
export type SupabaseUserLike = {
  id: string;
  app_metadata?: { provider?: string } | null;
  user_metadata?: Record<string, unknown> | null;
};

export type Identity = {
  id: string;
  provider: AuthProvider;
  displayName: string | null;
  avatarUrl: string | null;
};

/** metadata 값은 무엇이든 올 수 있어 문자열만 통과시킴 */
function text(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

// 카카오는 닉네임을 여러 키로 보내고 구글은 name·full_name 을 씀
const NAME_KEYS = ["name", "full_name", "nickname", "user_name", "preferred_username"];
const AVATAR_KEYS = ["avatar_url", "picture", "profile_image_url", "profile_image"];

/**
 * 로그인 직후의 Supabase 사용자를 프로필 입력으로 바꿈
 * provider 를 못 읽으면 undefined. 지원하지 않는 경로로 들어온 계정을 기록하지 않음
 */
export function toIdentity(
  user: SupabaseUserLike,
): Identity | undefined {
  const parsed = authProvider.safeParse(user.app_metadata?.provider);
  if (!parsed.success) return undefined;

  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    provider: parsed.data,
    displayName: text(metadata, NAME_KEYS),
    avatarUrl: text(metadata, AVATAR_KEYS),
  };
}
