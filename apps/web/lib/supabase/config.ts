// Supabase Auth 접속 값. anon 키는 브라우저로 나가도 되는 공개 키이고
// 테이블 접근은 RLS 와 REVOKE 로 이미 막혀 있음(마이그레이션 0002·0007·0008)
// service role 키는 이 경로에 절대 쓰지 않음

/** 로그인 화면과 콜백이 모두 이 판정을 씀. 값이 없으면 SNS 로그인을 걸지 않음 */
export function isAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  );
}

/** 클라이언트 생성 직전에 부름. 없으면 설정 누락이라 즉시 알림 */
export function requireAuthConfig(): { url: string; anonKey: string } {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다",
    );
  }
  return { url, anonKey };
}
