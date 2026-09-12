"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import { Screen, ScreenBody } from "./screen";

// WEB-27 원인과 다음 행동만 알리고 내부 정보는 감추며 자동 재시도는 없음

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
  /** Next 의 digest 를 그대로 씀. 스택 키 좌표 토큰은 넣지 않음 */
  requestId?: string;
  /** 있으면 같은 요청을 한 번 더 시도함 */
  onRetry?: () => void;
  /** 급한 상황 안내 링크. 안전과 무관한 화면에서는 끔 */
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
    <Screen>
      <ScreenBody pt="x12" gap="x6">
        <VStack align="stretch" gap="x2">
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            {online ? title : "연결이 끊긴 것 같습니다"}
          </Text>
          <Text textStyle="t5Regular" color="fg.neutralMuted">
            {online ? description : "연결 상태를 확인한 뒤 다시 시도해 주십시오"}
          </Text>
        </VStack>

        {requestId ? (
          <VStack align="stretch" gap="x1">
            <Text textStyle="t2Regular" color="fg.neutralSubtle">
              요청 번호와 함께 문의할 수 있습니다
            </Text>
            <Text textStyle="t2Regular" color="fg.neutralMuted" userSelect="text">
              {requestId}
            </Text>
          </VStack>
        ) : null}

        <VStack align="stretch" gap="x2">
          {onRetry ? (
            <ActionButton variant="brandSolid" size="large" onClick={onRetry}>
              다시 시도
            </ActionButton>
          ) : null}
          <ActionButton variant="neutralOutline" size="large" asChild>
            <Link href="/">홈으로</Link>
          </ActionButton>
          {safetyLink ? (
            <ActionButton variant="ghost" size="medium" asChild>
              <Link href="/guide/injured">급한 상황이면 구조 요청하기</Link>
            </ActionButton>
          ) : null}
        </VStack>
      </ScreenBody>
    </Screen>
  );
}
