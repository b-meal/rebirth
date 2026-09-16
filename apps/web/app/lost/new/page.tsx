import { createSignedUrls } from "@rebirth/core/storage";
import { listPetPhotos, listPets } from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";
import { LostForm, type LostFormPet } from "@/components/lost/lost-form";

export const metadata = {
  title: "반려동물을 잃어버렸어요",
  // 신고 폼은 검색 대상이 아님
  robots: { index: false },
};

// 적어 둔 동물 목록을 여기서 읽어 넘김. 폼이 직접 부르면 칸이 빈 채로 한 번 그려짐
export const dynamic = "force-dynamic";

/** 사진은 비공개 버킷이라 서명해 넘김. 실패해도 목록은 그대로 보여 손으로 올릴 수 있음 */
async function photoUrlsOf(petId: string): Promise<string[]> {
  try {
    const rows = await listPetPhotos(petId);
    const signed = await createSignedUrls(rows.map((row) => row.storagePath));
    return rows
      .map((row) => signed.get(row.storagePath))
      .filter((url): url is string => Boolean(url));
  } catch {
    return [];
  }
}

async function loadPets(): Promise<LostFormPet[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const rows = await listPets(user.id);
    // 등록번호는 신고에 쓰지 않으므로 화면으로 내보내지 않음
    return await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        name: row.name,
        animalType: row.animalType,
        breedGuess: row.breedGuess,
        size: row.size,
        colors: row.colors,
        note: row.note,
        photoUrls: await photoUrlsOf(row.id),
      })),
    );
  } catch {
    // 목록을 못 읽어도 신고는 손으로 적어 마칠 수 있어야 함
    return [];
  }
}

export default async function LostNewPage({ searchParams }: PageProps<"/lost/new">) {
  // 우리 동물 상세에서 바로 넘어오면 그 아이가 고른 상태로 시작함
  const { petId } = await searchParams;

  return (
    <LostForm
      pets={await loadPets()}
      initialPetId={typeof petId === "string" ? petId : undefined}
    />
  );
}
