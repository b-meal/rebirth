"use server";

import { redirect } from "next/navigation";

import { HOME_PATH } from "@rebirth/core/auth";

import { createClient } from "@/lib/supabase/server";

// 로그아웃. 이 기기의 세션만 지우고 다른 기기 세션은 건드리지 않음

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(HOME_PATH);
}
