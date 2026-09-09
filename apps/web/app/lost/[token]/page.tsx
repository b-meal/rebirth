import { LostView } from "@/components/lost/lost-view";

export const metadata = {
  title: "확인할 후보",
  // 토큰이 담긴 주소라 색인하지 않음
  robots: { index: false, follow: false },
};

export default function LostTokenPage() {
  return <LostView />;
}
