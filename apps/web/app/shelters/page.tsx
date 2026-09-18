import { logFailure } from "@rebirth/core/http";
import { listSidoRegions } from "@rebirth/db";

import { SheltersScreen } from "@/components/shelters/shelters-screen";

// 보호·구조 기관 찾기. 제보 전에도 볼 수 있게 독립 화면으로 둠

export const metadata = {
  title: "보호·구조 기관",
  robots: { index: false },
};

// 기관 목록은 자주 바뀌지 않지만 시드를 다시 돌리면 바로 반영돼야 함
export const revalidate = 3600;

/**
 * db 프록시는 DATABASE_URL 이 없으면 호출 시점에 바로 던짐
 * 약속이 만들어지기 전이라 catch 가 붙지 않으므로 try 로 감싸야 함
 * 접속이 없는 CI 빌드에서도 화면이 나오고 지역 칩만 비게 됨
 */
async function loadRegions(): Promise<string[]> {
  try {
    const rows = await listSidoRegions();
    return rows.map((row) => row.orgNm);
  } catch (error) {
    logFailure("shelters.regions", error);
    return [];
  }
}

export default async function SheltersPage() {
  return <SheltersScreen regions={await loadRegions()} />;
}
