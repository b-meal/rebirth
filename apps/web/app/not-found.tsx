import { ErrorView } from "@/components/ui/error-view";

export default function NotFound() {
  return (
    <ErrorView
      title="찾을 수 없는 주소입니다"
      description="주소가 바뀌었거나 기록이 더 이상 공개되지 않을 수 있습니다"
    />
  );
}
