import { LostForm } from "../../../components/lost/lost-form";

export const metadata = {
  title: "반려동물을 잃어버렸어요",
  // 신고 폼은 검색 대상이 아님
  robots: { index: false },
};

export default function LostNewPage() {
  return <LostForm />;
}
