import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";
import { findCategory } from "@rebirth/core/community";

import { PostForm } from "@/components/community/post-form";
import { getCurrentUser } from "@/lib/auth/session";

// 글쓰기. proxy 가 이미 막지만 낙관적 차단이라 여기서 다시 확인함
// 주제는 앞의 바텀시트가 쿼리로 넘겨 줌

export const metadata: Metadata = {
  title: "글쓰기",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const SELF = "/community/new";

export default async function NewCommunityPostPage({
  searchParams,
}: PageProps<"/community/new">) {
  const params = await searchParams;
  const raw = params.category;
  const picked = findCategory(Array.isArray(raw) ? raw[0] : raw);

  // 주소를 직접 열어 주제가 없으면 고르는 자리로 되돌림
  if (!picked) redirect("/community");

  const user = await getCurrentUser();
  if (!user) {
    // 로그인 후 고른 주제 그대로 돌아오게 함
    const next = `${SELF}?category=${picked.id}`;
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(next)}`);
  }

  return <PostForm category={picked} />;
}
