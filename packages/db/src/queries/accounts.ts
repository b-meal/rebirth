import 'server-only'

import { eq, isNull, and, desc } from 'drizzle-orm'

import { db } from '../client'
import { pets, userProfiles, type UserProfile } from '../schema'
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

export async function insertPet(input: typeof pets.$inferInsert) {
  const [row] = await db.insert(pets).values(input).returning({ id: pets.id })
  return row
}

/** 소유자가 맞을 때만 지움. 남의 기록을 지우는 요청은 0건으로 끝남 */
export async function deletePet(input: { id: string; ownerId: string }) {
  const removed = await db
    .delete(pets)
    .where(and(eq(pets.id, input.id), eq(pets.ownerId, input.ownerId)))
    .returning({ id: pets.id, photoPath: pets.photoPath })
  return removed[0]
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
