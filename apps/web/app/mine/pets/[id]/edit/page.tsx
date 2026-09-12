import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";
import { createSignedThumbUrls } from "@rebirth/core/storage";
import { findPet, listPetPhotos } from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";
import { PetForm } from "@/components/mine/pet-form";

// 등록한 동물 고치기. 등록과 같은 폼을 값이 채워진 채로 씀

export const metadata: Metadata = { title: "우리 동물 수정", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function EditPetPage({ params }: PageProps<"/mine/pets/[id]/edit">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(`/mine/pets/${id}/edit`)}`);
  }

  // 소유자가 아니면 없는 것으로 다룸. 남의 기록이 있다는 사실도 알리지 않음
  const pet = await findPet({ id, ownerId: user.id });
  if (!pet) notFound();

  // 고치는 화면의 사진은 작게만 보여 줘 썸네일이면 충분함
  const rows = await listPetPhotos(id);
  const signed = await createSignedThumbUrls(rows.map((row) => row.storagePath)).catch(
    () => new Map<string, string>(),
  );

  return (
    <PetForm
      pet={{
        id: pet.id,
        name: pet.name,
        animalType: pet.animalType,
        breedGuess: pet.breedGuess,
        size: pet.size,
        colors: pet.colors,
        note: pet.note,
        photos: rows.flatMap((row) => {
          const url = signed.get(row.storagePath);
          return url ? [{ path: row.storagePath, url }] : [];
        }),
      }}
    />
  );
}
