import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { getCurrentUser } from "@/lib/auth/session";
import { ProfileForm } from "@/components/mine/profile-form";

// 프로필 수정. 이름만 사용자가 고치고 사진은 제공자에서 온 값을 씀

export const metadata: Metadata = { title: "프로필 수정", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=%2Fmine%2Fprofile`);

  return (
    <ProfileForm
      displayName={user.displayName ?? ""}
      avatarUrl={user.avatarUrl}
    />
  );
}
