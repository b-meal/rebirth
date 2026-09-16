import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";
import { createSignedUrls } from "@rebirth/core/storage";
import { findPet, listPetPhotos } from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";
import { PetDetail } from "@/components/mine/pet-detail";

// 등록한 동물 한 마리. 올려 둔 사진을 모두 넘겨 보는 자리

/**
 * 등록 시각을 사람이 읽는 날짜로
 * 시간대를 한국으로 못박음. 배포 서버는 UTC 라 그대로 두면 한국 시간 아침에 적은 기록이
 * 하루 앞선 날짜로 보임
 */
const DAY = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatDay(value: Date): string {
  return DAY.format(value);
}

export const metadata: Metadata = { title: "우리 동물", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function PetPage({ params }: PageProps<"/mine/pets/[id]">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(`/mine/pets/${id}`)}`);
  }

  // 소유자가 아니면 없는 것으로 다룸. 남의 기록이 있다는 사실도 알리지 않음
  const pet = await findPet({ id, ownerId: user.id });
  if (!pet) notFound();

  const rows = await listPetPhotos(id);
  const signed = await createSignedUrls(rows.map((row) => row.storagePath)).catch(
    () => new Map<string, string>(),
  );
  const photoUrls = rows
    .map((row) => signed.get(row.storagePath))
    .filter((url): url is string => Boolean(url));

  return (
    <PetDetail
      pet={{
        id: pet.id,
        name: pet.name,
        animalType: pet.animalType,
        breedGuess: pet.breedGuess,
        size: pet.size,
        colors: pet.colors,
        registrationNumber: pet.registrationNumber,
        note: pet.note,
        createdAt: formatDay(pet.createdAt),
      }}
      photoUrls={photoUrls}
    />
  );
}
