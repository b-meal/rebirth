"use server";

import { revalidatePath } from "next/cache";

import { findUsableUploads } from "@rebirth/db";
import { deletePet, insertPet, updateUserProfile } from "@rebirth/db";
import { fieldErrors, findDraftSession } from "@rebirth/core/http";
import { removePhotos } from "@rebirth/core/storage";
import { animalSize, animalType, createPet, updateProfile } from "@rebirth/types";
import { headers } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";

// 마이페이지의 쓰기 동작. 모두 로그인 계정에 묶여 있어 먼저 사용자를 확인함

export type ActionState = {
  /** 필드별 첫 오류. 칸 아래에 붙여 어디를 고쳐야 하는지 그 자리에서 알림 */
  errors?: Record<string, string>;
  /** 저장 자체가 실패했을 때만 채움 */
  error?: string;
  ok?: boolean;
};

/** 서버 액션은 Request 를 받지 않아 쿠키를 헤더에서 되살려 초안 세션을 찾음 */
async function draftSessionId(): Promise<string | undefined> {
  const cookie = (await headers()).get("cookie") ?? "";
  return findDraftSession(new Request("http://local", { headers: { cookie } }));
}

export async function saveProfile(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요해요" };

  const parsed = updateProfile.safeParse({ displayName: form.get("displayName") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  await updateUserProfile({ id: user.id, displayName: parsed.data.displayName || null });
  revalidatePath("/mine");
  return { ok: true };
}

export async function addPet(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요해요" };

  const parsed = createPet.safeParse({
    name: form.get("name"),
    animalType: animalType.catch("unknown").parse(form.get("animalType")),
    breedGuess: form.get("breedGuess"),
    size: animalSize.catch("unknown").parse(form.get("size")),
    colors: form.getAll("colors").map(String),
    note: form.get("note"),
    uploadId: form.get("uploadId") || undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // 사진은 제보와 같은 초안 업로드를 거쳐 오고 경로만 옮겨 붙임
  let photoPath: string | null = null;
  if (parsed.data.uploadId) {
    const sessionId = await draftSessionId();
    if (sessionId) {
      const [upload] = await findUsableUploads({ sessionId, ids: [parsed.data.uploadId] });
      photoPath = upload?.storagePath ?? null;
    }
  }

  await insertPet({
    ownerId: user.id,
    name: parsed.data.name,
    animalType: parsed.data.animalType,
    breedGuess: parsed.data.breedGuess || null,
    size: parsed.data.size,
    colors: parsed.data.colors,
    note: parsed.data.note || null,
    photoPath,
  });

  revalidatePath("/mine");
  return { ok: true };
}

export async function removePet(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = String(form.get("id") ?? "");
  if (!id) return;

  const removed = await deletePet({ id, ownerId: user.id });
  // 기록을 지우면 사진도 남길 이유가 없음. 실패해도 삭제를 되돌리지 않음
  if (removed?.photoPath) await removePhotos([removed.photoPath]).catch(() => undefined);

  revalidatePath("/mine");
}
