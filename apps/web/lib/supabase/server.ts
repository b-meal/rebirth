import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireAuthConfig } from "./config";

// 서버 컴포넌트·라우트 핸들러·서버 액션에서 쓰는 클라이언트
// 요청마다 새로 만듦. 모듈에 담아 두면 다른 사람의 세션이 섞임

/**
 * 쿠키 저장소를 물린 클라이언트
 * 서버 컴포넌트에서는 쓰기가 막혀 있어 setAll 이 던짐. 토큰 갱신은 proxy 가 맡고
 * 여기서는 삼켜서 렌더가 죽지 않게 함
 */
export async function createClient() {
  const { url, anonKey } = requireAuthConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서 호출된 경우. proxy 가 이미 갱신을 처리함
        }
      },
    },
  });
}
