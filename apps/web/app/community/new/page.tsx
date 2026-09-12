import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { PostForm } from "@/components/community/post-form";
import { getCurrentUser } from "@/lib/auth/session";

// 글쓰기. proxy 가 이미 막지만 낙관적 차단이라 여기서 다시 확인함

export const metadata: Metadata = {
  title: "글쓰기",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const SELF = "/community/new";

export default async function NewCommunityPostPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(SELF)}`);
  }

  return <PostForm />;
}
