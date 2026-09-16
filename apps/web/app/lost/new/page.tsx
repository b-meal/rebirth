import { listPets } from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";
import { LostForm, type LostFormPet } from "@/components/lost/lost-form";

export const metadata = {
  title: "반려동물을 잃어버렸어요",
  // 신고 폼은 검색 대상이 아님
  robots: { index: false },
};

// 적어 둔 동물 목록을 여기서 읽어 넘김. 폼이 직접 부르면 칸이 빈 채로 한 번 그려짐
export const dynamic = "force-dynamic";

async function loadPets(): Promise<LostFormPet[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const rows = await listPets(user.id);
    // 등록번호와 메모는 신고에 쓰지 않으므로 화면으로 내보내지 않음
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      animalType: row.animalType,
      breedGuess: row.breedGuess,
      size: row.size,
      colors: row.colors,
    }));
  } catch {
    // 목록을 못 읽어도 신고는 손으로 적어 마칠 수 있어야 함
    return [];
  }
}

export default async function LostNewPage() {
  return <LostForm pets={await loadPets()} />;
}
