"use client";

import { ErrorView } from "../components/layout/error-view";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      title="지금 확인할 수 없어요"
      description="잠시 후 다시 시도해 주세요. 문제가 이어지면 요청 번호와 함께 알려 주시면 도움이 됩니다."
      requestId={error.digest}
      onRetry={reset}
    />
  );
}
