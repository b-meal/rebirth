"use server";

import { revalidatePath } from "next/cache";

import {
  addAreaSubscription,
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

export type SubscribeResult = { ok: boolean; reason?: "signed-out" | "limit" };

/** 제보 상세에서 그 동네를 구독함. 상한을 넘으면 이유를 돌려줘 화면이 안내함 */
export async function subscribeArea(input: {
  areaCode: string;
  areaCodeSystem: string;
  areaName: string;
}): Promise<SubscribeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "signed-out" };

  const system = areaCodeSystem.safeParse(input.areaCodeSystem);
  if (!system.success) return { ok: false, reason: "limit" };

  const added = await addAreaSubscription({
    userId: user.id,
    areaCode: input.areaCode,
    areaCodeSystem: system.data,
    areaName: input.areaName,
  });

  if (!added) return { ok: false, reason: "limit" };

  revalidatePath("/mine/notifications");
  revalidatePath("/mine");
  return { ok: true };
}
