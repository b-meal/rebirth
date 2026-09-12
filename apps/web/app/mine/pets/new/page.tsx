import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { getCurrentUser } from "@/lib/auth/session";
import { PetForm } from "@/components/mine/pet-form";

// 우리 동물 등록. 실종 신고를 빠르게 채우려고 미리 적어 두는 기록

export const metadata: Metadata = { title: "우리 동물 등록", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function NewPetPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=%2Fmine%2Fpets%2Fnew`);

  return <PetForm />;
}
