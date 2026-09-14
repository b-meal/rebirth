"use server";

import { revalidatePath } from "next/cache";

import {
  addAreaSubscription,
  findPublicReportArea,
  markAreaSubscriptionsRead,
  removeAreaSubscription,
} from "@rebirth/db";
import { areaCodeSystem } from "@rebirth/types";

import { getCurrentUser } from "@/lib/auth/session";

// 알림함의 쓰기 동작. 구독은 계정에 묶여 있어 먼저 사용자를 확인함

/**
 * 알림함을 본 시각을 올림
 * 목록을 그린 뒤에 부르므로 이번에 본 점은 남고 다음에 들어오면 사라짐
 * 그래서 여기서는 화면을 다시 그리지 않음
 */
export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;

  await markAreaSubscriptionsRead(user.id);
}

/** 동네 구독을 끊음. 목록과 배지가 함께 줄어야 해 마이페이지도 다시 그림 */
export async function unsubscribeArea(areaCode: string) {
  const user = await getCurrentUser();
  if (!user) return;

  await removeAreaSubscription(user.id, areaCode);
  revalidatePath("/mine/notifications");
  revalidatePath("/mine");
}

export type SubscribeResult = {
  ok: boolean;
  reason?: "signed-out" | "limit" | "no-area";
};

/**
 * 제보가 올라온 동네를 구독함
 * 공개 응답에 행정구역 코드가 없어 화면은 제보 id 만 넘기고 코드는 여기서 읽음
 */
export async function subscribeReportArea(
  reportId: string,
): Promise<SubscribeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "signed-out" };

  const area = await findPublicReportArea(reportId);
  const system = areaCodeSystem.safeParse(area?.areaCodeSystem);
  // 수동 지역으로 남긴 제보는 코드가 없어 구독할 동네를 특정하지 못함
  if (!area?.areaCode || !area.areaName || !system.success) {
    return { ok: false, reason: "no-area" };
  }

  const added = await addAreaSubscription({
    userId: user.id,
    areaCode: area.areaCode,
    areaCodeSystem: system.data,
    areaName: area.areaName,
  });

  if (!added) return { ok: false, reason: "limit" };

  revalidatePath("/mine/notifications");
  revalidatePath("/mine");
  return { ok: true };
}
