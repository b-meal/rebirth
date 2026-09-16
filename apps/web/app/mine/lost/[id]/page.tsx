import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";
import { isReportReporter } from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";
import { LostView } from "@/components/lost/lost-view";

// 내 실종 신고의 후보 화면. 관리 주소 대신 상세 화면의 관리 줄에서 들어옴
// 여기서는 내 기록인지만 확인하고, 후보 조회 권한은 API 가 관리 세션으로 다시 봄. POL-03

export const metadata: Metadata = { title: "확인할 후보", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function MineLostPage({ params }: PageProps<"/mine/lost/[id]">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(`/mine/lost/${id}`)}`);
  }

  // 남의 기록이면 있다는 사실도 알리지 않음
  const mine = await isReportReporter({ reportId: id, userId: user.id });
  if (!mine) notFound();

  return <LostView reportId={id} />;
}
