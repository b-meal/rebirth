import { RescueRequest } from "@/components/guide/rescue-request";

// 다친 동물을 봤을 때 쓰는 화면
// 안내문 대신 접수 폼을 둠. 급한 사람은 읽지 않고 바로 행동함

export const metadata = {
  title: "구조 요청",
  robots: { index: false },
};

export default function InjuredGuidePage() {
  return <RescueRequest />;
}
