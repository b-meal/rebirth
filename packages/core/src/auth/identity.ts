import { authProvider, type AuthProvider } from "@rebirth/types";

// Supabase 사용자에서 서비스가 쓸 표시 정보만 뽑음
// 제공자마다 metadata 키가 달라 그 차이를 이 파일 하나에 가둠
// server-only 를 import 하지 않음. 순수 변환이라 단위 테스트에서 그대로 돎

/** Supabase user 중 우리가 읽는 부분만. SDK 타입에 묶이지 않게 좁혀 받음 */
export type SupabaseUserLike = {
  id: string;
  app_metadata?: { provider?: string } | null;
  user_metadata?: Record<string, unknown> | null;
  /** 익명 계정 표시. provider 도 anonymous 로 오지만 이 값이 계약으로 문서화된 쪽임 */
  is_anonymous?: boolean;
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
  const provider = user.is_anonymous ? "anonymous" : user.app_metadata?.provider;
  const parsed = authProvider.safeParse(provider);
  if (!parsed.success) return undefined;

  const metadata = user.user_metadata ?? {};
  const displayName = text(metadata, NAME_KEYS);
  return {
    id: user.id,
    provider: parsed.data,
    // 익명 계정은 이름이 없어 커뮤니티에 알 수 없음 으로 찍히면 자기 글을 못 알아봄
    displayName: displayName ?? (parsed.data === "anonymous" ? guestName(user.id) : null),
    avatarUrl: text(metadata, AVATAR_KEYS),
  };
}

/** 익명 계정의 기본 이름. id 에서 뽑은 네 자리라 같은 사람은 늘 같은 이름을 봄 */
function guestName(id: string): string {
  const seed = Number.parseInt(id.replace(/-/g, "").slice(0, 6), 16);
  if (Number.isNaN(seed)) return "손님";
  return `손님 ${String(seed % 10_000).padStart(4, "0")}`;
}
