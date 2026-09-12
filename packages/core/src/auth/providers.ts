import { authProvider, type AuthProvider } from "@rebirth/types";

// 지원하는 SNS 제공자의 표시 정보와 검증. 새 제공자는 이 목록에만 추가하면
// 로그인 화면과 콜백이 함께 따라옴. 화면이 제공자를 하드코딩하지 않게 하는 자리
// server-only 를 import 하지 않음. 순수 데이터라 화면에서도 그대로 씀

export type ProviderDescriptor = {
  id: AuthProvider;
  /** 버튼에 들어가는 문구. "카카오로 계속하기" 처럼 계속 진행을 뜻하는 말로 둠 */
  label: string;
  /** Supabase Auth 에 넘기는 제공자 이름 */
  supabaseProvider: AuthProvider;
  /**
   * 추가로 요청할 권한. 카카오는 동의 항목을 앱에서 켜야 프로필이 넘어옴
   * 이메일을 필수 동의로 두지 않아 거절해도 로그인은 성립함
   */
  scopes?: string;
};

/** 화면에 그릴 순서대로 둠. 국내 사용자가 먼저 찾는 카카오를 위에 놓음 */
export const AUTH_PROVIDERS: readonly ProviderDescriptor[] = [
  {
    id: "kakao",
    label: "카카오로 계속하기",
    supabaseProvider: "kakao",
    scopes: "profile_nickname profile_image",
  },
  {
    id: "google",
    label: "구글로 계속하기",
    supabaseProvider: "google",
  },
] as const;

const BY_ID = new Map(AUTH_PROVIDERS.map((entry) => [entry.id, entry]));

/** 알 수 없는 제공자는 undefined. 콜백과 시작 경로가 같은 판정을 씀 */
export function findProvider(
  value: string | null | undefined,
): ProviderDescriptor | undefined {
  if (!value) return undefined;
  const parsed = authProvider.safeParse(value);
  return parsed.success ? BY_ID.get(parsed.data) : undefined;
}
