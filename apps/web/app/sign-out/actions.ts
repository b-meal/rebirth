"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HOME_PATH, LAST_SEEN_COOKIE } from "@rebirth/core/auth";

import { createClient } from "@/lib/supabase/server";

// 로그아웃. 이 기기의 세션만 지우고 다른 기기 세션은 건드리지 않음

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 활동 기록도 함께 지움. 남겨 두면 다음 로그인이 남의 시각을 물려받음
  (await cookies()).delete(LAST_SEEN_COOKIE);

  redirect(HOME_PATH);
}
