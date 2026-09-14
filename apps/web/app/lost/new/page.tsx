import { createSignedUrls } from "@rebirth/core/storage";
import { findPet, listPetPhotos } from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";
import { breedLabel } from "@/lib/report-label";
import { LostForm, type LostPrefill } from "@/components/lost/lost-form";

export const metadata = {
  title: "반려동물을 잃어버렸어요",
  // 신고 폼은 검색 대상이 아님
  robots: { index: false },
};

// petId 가 붙어 오면 등록해 둔 동물을 읽어 폼을 미리 채움
export const dynamic = "force-dynamic";

// 우리 동물은 모름을 담을 수 있지만 실종 신고는 셋 중 하나를 골라야 함
const ANIMAL_FALLBACK = "dog" as const;
const SIZE_FALLBACK = "small" as const;

/** 등록 정보를 실종 신고의 특징 한 문단으로 옮김. 무선식별번호는 공개 글이라 담지 않음 */
function toAppearance(breedGuess: string | null, note: string | null): string {
  return [breedLabel(breedGuess), note].filter(Boolean).join("\n\n");
}

// 주소로 들어오는 값이라 uuid 가 아닌 것이 올 수 있음. 그대로 질의하면 드라이버가 예외를 냄
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPrefill(petId: string): Promise<LostPrefill | undefined> {
  if (!UUID.test(petId)) return undefined;

  const user = await getCurrentUser();
  if (!user) return undefined;

  // 소유자가 아니면 없는 것으로 다룸. 남의 기록이 있다는 사실도 알리지 않음
  const pet = await findPet({ id: petId, ownerId: user.id });
  if (!pet) return undefined;

  const rows = await listPetPhotos(petId);
  const signed = await createSignedUrls(rows.map((row) => row.storagePath)).catch(
    () => new Map<string, string>(),
  );

  return {
    animalType: pet.animalType === "unknown" ? ANIMAL_FALLBACK : pet.animalType,
    size: pet.size === "unknown" ? SIZE_FALLBACK : pet.size,
    colors: pet.colors,
    appearance: toAppearance(pet.breedGuess, pet.note),
    photoUrls: rows
      .map((row) => signed.get(row.storagePath))
      .filter((url): url is string => Boolean(url)),
  };
}

export default async function LostNewPage({ searchParams }: PageProps<"/lost/new">) {
  const { petId } = await searchParams;
  const prefill = typeof petId === "string" ? await loadPrefill(petId) : undefined;

  return <LostForm prefill={prefill} />;
}
