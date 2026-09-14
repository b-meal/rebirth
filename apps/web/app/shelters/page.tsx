import { listSidoRegions } from "@rebirth/db";

import { SheltersScreen } from "@/components/shelters/shelters-screen";

// 보호, 구조 기관 찾기. 제보 전에도 볼 수 있게 독립 화면으로 둠

export const metadata = {
  title: "보호, 구조 기관",
  robots: { index: false },
};

// 기관 목록은 자주 바뀌지 않지만 시드를 다시 돌리면 바로 반영돼야 함
export const revalidate = 3600;

export default async function SheltersPage() {
  const regions = await listSidoRegions().catch(() => []);
  return <SheltersScreen regions={regions.map((row) => row.orgNm)} />;
}
