"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  MANAGE_COOKIE,
  MANAGE_COOKIE_MAX_AGE,
  createManageSession,
  findManageSession,
} from "@rebirth/core/http";
import { grantManageAccess, isReportReporter } from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";

// 로그인 계정으로 내 신고의 관리 권한을 여는 자리
// 권한은 그대로 관리 세션에서만 나옴. 계정은 세션을 받을 자격을 증명하는 길임
// 관리 주소를 잃어버린 보호자가 자기 신고를 고치지도 닫지도 못하던 막다른 길을 엶

/** 서버 액션은 Request 를 받지 않아 쿠키를 헤더에서 되살려 기존 세션을 찾음 */
async function currentManageSession(): Promise<string | undefined> {
  const cookie = (await headers()).get("cookie") ?? "";
  return findManageSession(new Request("http://local", { headers: { cookie } }));
}

/**
 * 내 신고의 관리 권한을 이 브라우저에 붙임
 * 작성자 계정으로 로그인한 경우에만 통과함. 남의 기록은 아무것도 바꾸지 않고 false 를 돌려줌
 */
export async function startManaging(reportId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // 계정이 작성자인지가 유일한 조건. 공개 id 만으로는 여기까지 오지 못함. POL-03
  const mine = await isReportReporter({ reportId, userId: user.id });
  if (!mine) return false;

  // 이미 세션이 있으면 권한만 더함. 한 세션이 여러 기록을 관리할 수 있음
  const existing = await currentManageSession();
  if (existing) {
    await grantManageAccess({ sessionId: existing, reportId });
  } else {
    const session = await createManageSession();
    await grantManageAccess({ sessionId: session.sessionId, reportId });

    // 발급 응답과 같은 값으로 심음. 원문 토큰은 여기서만 쓰고 저장하지 않음
    const token = session.setCookie.split(";")[0]?.split("=")[1] ?? "";
    (await cookies()).set(MANAGE_COOKIE, decodeURIComponent(token), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MANAGE_COOKIE_MAX_AGE,
    });
  }

  revalidatePath(`/r/${reportId}`);
  return true;
}
