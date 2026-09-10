"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button, Flex, Heading, Text } from "@chakra-ui/react";

// WEB-27. 원인과 다음 행동만 알리고 내부 정보는 드러내지 않음
// 404·403·오프라인·점검을 사용자 관점으로 나눔. 자동 재시도는 하지 않음

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export type ErrorViewProps = {
  title: string;
  description: string;
  // Next 의 digest 를 그대로 씀. 스택·키·좌표·토큰은 넣지 않음
  requestId?: string;
  // 있으면 같은 요청을 한 번 더 시도함
  onRetry?: () => void;
  // 급한 상황 안내 링크. 안전과 무관한 화면에서는 끔
  safetyLink?: boolean;
};

export function ErrorView({
  title,
  description,
  requestId,
  onRetry,
  safetyLink = true,
}: ErrorViewProps) {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  return (
    <Flex direction="column" gap="4" paddingInline="screen" paddingTop="16" paddingBottom="block">
      <Flex direction="column" gap="2">
        <Heading size="xl">{online ? title : "연결이 끊긴 것 같습니다"}</Heading>
        <Text color="fg.alternative">
          {online ? description : "연결 상태를 확인한 뒤 다시 시도해 주십시오"}
        </Text>
      </Flex>

      {requestId ? (
        <Flex direction="column" gap="1">
          <Text textStyle="caption" color="fg.assistive">
            요청 번호와 함께 문의할 수 있습니다
          </Text>
          <Text textStyle="caption" userSelect="all">
            {requestId}
          </Text>
        </Flex>
      ) : null}

      <Flex direction="column" gap="2" marginTop="2">
        {onRetry ? (
          <Button size="xl" colorPalette="brand" width="100%" onClick={onRetry}>
            다시 시도
          </Button>
        ) : null}
        <Button asChild variant="outline" width="100%">
          <Link href="/">홈으로</Link>
        </Button>
        {safetyLink ? (
          <Button asChild variant="ghost" width="100%">
            <Link href="/guide/injured">급한 상황이라면 안전 안내 보기</Link>
          </Button>
        ) : null}
      </Flex>
    </Flex>
  );
}
