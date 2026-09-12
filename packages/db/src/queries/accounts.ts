import 'server-only'

import { eq, isNull, and, desc } from 'drizzle-orm'

import { db } from '../client'
import { petPhotos, pets, userProfiles, type UserProfile } from '../schema'
import type { AuthProvider } from '@rebirth/types'

// 로그인 계정 조회와 기록. 신원 확인은 Supabase Auth 가 이미 끝낸 뒤에 호출됨

export type UpsertProfileInput = {
  id: string
  provider: AuthProvider
  displayName?: string | null
  avatarUrl?: string | null
}

/**
 * 로그인마다 호출해 프로필을 만들거나 갱신함
 * provider 는 최초 값을 유지해 처음 들어온 경로를 남김
 * 탈퇴한 계정이 다시 로그인하면 deletedAt 을 지워 되살림
 */
export async function upsertUserProfile(
  input: UpsertProfileInput,
): Promise<UserProfile> {
  const [row] = await db
    .insert(userProfiles)
    .values({
      id: input.id,
      provider: input.provider,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
    })
    .onConflictDoUpdate({
      target: userProfiles.id,
      set: {
        displayName: input.displayName ?? null,
        avatarUrl: input.avatarUrl ?? null,
        lastSignedInAt: new Date(),
        deletedAt: null,
      },
    })
    .returning()

  if (!row) throw new Error('user_profiles upsert 가 행을 돌려주지 않았습니다')
  return row
}

/** 탈퇴하지 않은 계정만 돌려줌 */
export async function findUserProfile(
  id: string,
): Promise<UserProfile | undefined> {
  const [row] = await db
    .select()
    .from(userProfiles)
    .where(and(eq(userProfiles.id, id), isNull(userProfiles.deletedAt)))
    .limit(1)
  return row
}

/** 탈퇴 표시. 행을 지우지 않아 남긴 제보와의 연결이 끊기지 않음 */
export async function markUserProfileDeleted(id: string): Promise<void> {
  await db
    .update(userProfiles)
    .set({ deletedAt: new Date() })
    .where(eq(userProfiles.id, id))
}

/* 반려동물 기록 */

/** 내가 등록한 동물. 최근에 넣은 것이 앞에 옴 */
export function listPets(ownerId: string, limit = 20) {
  return db
    .select()
    .from(pets)
    .where(eq(pets.ownerId, ownerId))
    .orderBy(desc(pets.createdAt))
    .limit(limit)
}

/** 한 마리. 소유자가 맞을 때만 돌려줘 주소를 알아도 남의 기록이 열리지 않음 */
export async function findPet(input: { id: string; ownerId: string }) {
  const [row] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.id, input.id), eq(pets.ownerId, input.ownerId)))
    .limit(1)
  return row
}

/**
 * 사진은 여러 장을 자식 표에 두고 첫 장만 pets.photoPath 에 둠
 * 목록은 대표 한 장만 그려 매번 자식 표를 조인하지 않아도 됨
 */
export async function insertPet(
  input: typeof pets.$inferInsert & { photoPaths?: string[] },
) {
  const { photoPaths = [], ...values } = input

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(pets)
      .values({ ...values, photoPath: photoPaths[0] ?? values.photoPath ?? null })
      .returning({ id: pets.id })

    if (!row) throw new Error('pets insert 가 행을 돌려주지 않았습니다')

    if (photoPaths.length > 0) {
      await tx.insert(petPhotos).values(
        photoPaths.map((storagePath, sortOrder) => ({
          petId: row.id,
          storagePath,
          sortOrder,
        })),
      )
    }

    return row
  })
}

/**
 * 등록한 동물을 고침. 소유자가 맞을 때만 바뀜
 * 사진은 남길 것과 새로 올린 것을 합쳐 통째로 다시 씀
 * 빠진 경로는 스토리지에서도 지우도록 removedPaths 로 돌려줌
 */
export async function updatePetRecord(input: {
  id: string
  ownerId: string
  values: Omit<typeof pets.$inferInsert, 'ownerId' | 'photoPath'>
  photoPaths: string[]
}) {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: pets.id })
      .from(pets)
      .where(and(eq(pets.id, input.id), eq(pets.ownerId, input.ownerId)))
      .limit(1)
    if (!owned) return undefined

    const before = await tx
      .select({ storagePath: petPhotos.storagePath })
      .from(petPhotos)
      .where(eq(petPhotos.petId, input.id))

    await tx
      .update(pets)
      .set({ ...input.values, photoPath: input.photoPaths[0] ?? null })
      .where(eq(pets.id, input.id))

    // 순서까지 바뀔 수 있어 지우고 다시 넣는 편이 어긋날 여지가 없음
    await tx.delete(petPhotos).where(eq(petPhotos.petId, input.id))
    if (input.photoPaths.length > 0) {
      await tx.insert(petPhotos).values(
        input.photoPaths.map((storagePath, sortOrder) => ({
          petId: input.id,
          storagePath,
          sortOrder,
        })),
      )
    }

    const kept = new Set(input.photoPaths)
    const removedPaths = before
      .map((row) => row.storagePath)
      .filter((path) => !kept.has(path))

    return { id: input.id, removedPaths }
  })
}

/** 한 마리에 붙은 사진 전부. 고른 순서대로 */
export function listPetPhotos(petId: string) {
  return db
    .select({ storagePath: petPhotos.storagePath })
    .from(petPhotos)
    .where(eq(petPhotos.petId, petId))
    .orderBy(petPhotos.sortOrder)
}

/**
 * 소유자가 맞을 때만 지움. 남의 기록을 지우는 요청은 0건으로 끝남
 * 자식 표는 cascade 로 함께 지워지므로 스토리지에서 지울 경로를 먼저 모음
 */
export async function deletePet(input: { id: string; ownerId: string }) {
  return db.transaction(async (tx) => {
    const paths = await tx
      .select({ storagePath: petPhotos.storagePath })
      .from(petPhotos)
      .where(eq(petPhotos.petId, input.id))

    const removed = await tx
      .delete(pets)
      .where(and(eq(pets.id, input.id), eq(pets.ownerId, input.ownerId)))
      .returning({ id: pets.id, photoPath: pets.photoPath })

    const row = removed[0]
    if (!row) return undefined

    // 대표 사진은 자식 표에도 같은 경로로 있어 겹치지 않게 모음
    const photoPaths = [
      ...new Set([...(row.photoPath ? [row.photoPath] : []), ...paths.map((p) => p.storagePath)]),
    ]
    return { ...row, photoPaths }
  })
}

/** 프로필에서 사용자가 직접 고칠 수 있는 값만 받음 */
export async function updateUserProfile(input: {
  id: string
  displayName: string | null
}): Promise<UserProfile | undefined> {
  const [row] = await db
    .update(userProfiles)
    .set({ displayName: input.displayName })
    .where(eq(userProfiles.id, input.id))
    .returning()
  return row
}
