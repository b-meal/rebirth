"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HStack, Icon, PrefixIcon, Text, VStack } from "@seed-design/react";
import { IconBellLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { subscribeReportArea } from "@/app/mine/notifications/actions";

// 제보가 올라온 동네를 구독하는 자리
// 행정구역 코드는 공개 응답에 없어 제보 id 만 보내고 서버가 동네를 찾음

export type AreaSubscribeButtonProps = {
  reportId: string;
  areaName: string;
  /** 이미 구독한 동네면 켜진 상태로 시작함 */
  subscribed: boolean;
};

const MESSAGE = {
  limit: "구독할 수 있는 동네를 다 채웠어요. 알림에서 하나를 해제해 주세요",
  "no-area": "이 제보는 동네가 정해지지 않아 알림을 받을 수 없어요",
} as const;

export function AreaSubscribeButton({
  reportId,
  areaName,
  subscribed,
}: AreaSubscribeButtonProps) {
  const router = useRouter();
  const [on, setOn] = useState(subscribed);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (on) {
    return (
      <HStack gap="x1_5" align="center" py="x1">
        <Icon svg={<IconBellLine />} size="x4" color="fg.brand" />
        <Text textStyle="t3Regular" color="fg.brand">
          {areaName} 알림을 받고 있어요
        </Text>
      </HStack>
    );
  }

  const subscribe = () =>
    start(async () => {
      const result = await subscribeReportArea(reportId);

      if (result.ok) {
        setOn(true);
        setProblem(null);
        return;
      }

      if (result.reason === "signed-out") {
        router.push(`${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(`/r/${reportId}`)}`);
        return;
      }

      setProblem(MESSAGE[result.reason ?? "no-area"]);
    });

  return (
    <VStack align="stretch" gap="x1_5">
      <HStack align="stretch">
        <ActionButton
          variant="neutralWeak"
          size="medium"
          loading={pending}
          onClick={subscribe}
        >
          <PrefixIcon svg={<IconBellLine />} />
          {areaName} 알림 받기
        </ActionButton>
      </HStack>
      {problem ? (
        <Text textStyle="t2Regular" color="fg.critical">
          {problem}
        </Text>
      ) : null}
    </VStack>
  );
}
