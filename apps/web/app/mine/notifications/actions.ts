"use server";

import { revalidatePath } from "next/cache";

import {
  addAreaSubscription,
  findPublicReportArea,
  markAreaSubscriptionsRead,
  markMatchAlertsRead,
  removeAreaSubscription,
  setMatchAlert,
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

  // 동네와 닮은 제보를 함께 올림. 알림함은 한 화면이라 읽음도 한 번에 둠
  await Promise.all([
    markAreaSubscriptionsRead(user.id),
    markMatchAlertsRead(user.id),
  ]);
}

/**
 * 실종 신고별 닮은 제보 알림을 켜고 끔
 * 내 기록이 아니면 아무것도 바꾸지 않음. 상세와 배지가 함께 바뀌어야 해 둘 다 다시 그림
 */
export async function toggleMatchAlert(
  reportId: string,
  enabled: boolean,
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const changed = await setMatchAlert({ reportId, userId: user.id, enabled });
  if (!changed) return false;

  revalidatePath(`/r/${reportId}`);
  revalidatePath("/mine/notifications");
  revalidatePath("/mine");
  return true;
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
