"use server";

import { revalidatePath } from "next/cache";

import { findUsableUploads } from "@rebirth/db";
import { deletePet, insertPet, updatePetRecord, updateUserProfile } from "@rebirth/db";
import { fieldErrors, findDraftSession } from "@rebirth/core/http";
import { removePhotos } from "@rebirth/core/storage";
import {
  animalSize,
  animalType,
  createPet,
  PHOTO_MAX_COUNT,
  updatePet,
  updateProfile,
} from "@rebirth/types";
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

/**
 * 올려 둔 사진 참조를 저장 경로로 바꿈
 * 질의는 제 순서로 돌려주므로 고른 차례대로 다시 세움. 첫 장이 목록의 대표 사진이 됨
 * 남의 세션 것이나 이미 쓴 참조는 질의에서 빠져 조용히 사라짐
 */
async function resolveUploadPaths(uploadIds: string[]): Promise<string[]> {
  if (uploadIds.length === 0) return [];

  const sessionId = await draftSessionId();
  if (!sessionId) return [];

  const rows = await findUsableUploads({ sessionId, ids: uploadIds });
  const byId = new Map(rows.map((row) => [row.id, row.storagePath]));
  return uploadIds.flatMap((id) => {
    const path = byId.get(id);
    return path ? [path] : [];
  });
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
    uploadIds: form.getAll("uploadIds").map(String).filter(Boolean),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  await insertPet({
    ownerId: user.id,
    name: parsed.data.name,
    animalType: parsed.data.animalType,
    breedGuess: parsed.data.breedGuess || null,
    size: parsed.data.size,
    colors: parsed.data.colors,
    note: parsed.data.note || null,
    photoPaths: await resolveUploadPaths(parsed.data.uploadIds),
  });

  revalidatePath("/mine");
  return { ok: true };
}

export async function editPet(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요해요" };

  const parsed = updatePet.safeParse({
    id: form.get("id"),
    name: form.get("name"),
    animalType: animalType.catch("unknown").parse(form.get("animalType")),
    breedGuess: form.get("breedGuess"),
    size: animalSize.catch("unknown").parse(form.get("size")),
    colors: form.getAll("colors").map(String),
    note: form.get("note"),
    uploadIds: form.getAll("uploadIds").map(String).filter(Boolean),
    keepPhotoPaths: form.getAll("keepPhotoPaths").map(String).filter(Boolean),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // 남긴 사진이 앞, 새로 올린 사진이 뒤. 첫 장이 목록의 대표가 됨
  const added = await resolveUploadPaths(parsed.data.uploadIds);
  const photoPaths = [...parsed.data.keepPhotoPaths, ...added].slice(0, PHOTO_MAX_COUNT);

  const result = await updatePetRecord({
    id: parsed.data.id,
    ownerId: user.id,
    values: {
      name: parsed.data.name,
      animalType: parsed.data.animalType,
      breedGuess: parsed.data.breedGuess || null,
      size: parsed.data.size,
      colors: parsed.data.colors,
      note: parsed.data.note || null,
    },
    photoPaths,
  });
  if (!result) return { error: "기록을 찾을 수 없어요" };

  // 화면에서 뺀 사진은 스토리지에도 남길 이유가 없음. 실패해도 저장을 되돌리지 않음
  if (result.removedPaths.length > 0) {
    await removePhotos(result.removedPaths).catch(() => undefined);
  }

  revalidatePath("/mine");
  revalidatePath(`/mine/pets/${parsed.data.id}`);
  return { ok: true };
}

export async function removePet(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = String(form.get("id") ?? "");
  if (!id) return;

  const removed = await deletePet({ id, ownerId: user.id });
  // 기록을 지우면 사진도 남길 이유가 없음. 실패해도 삭제를 되돌리지 않음
  if (removed?.photoPaths.length) {
    await removePhotos(removed.photoPaths).catch(() => undefined);
  }

  revalidatePath("/mine");
}
