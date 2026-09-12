"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconCheckmarkCircleFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

// 조회 토큰을 한 번만 보여줌, 복사를 주요 동작으로 두고 저장소에는 남기지 않음
// 신고는 이미 끝났으므로 먼저 끝났다고 말하고, 주소를 왜 챙겨야 하는지 한 줄로만 밝힘

export type TokenNoticeProps = {
  token: string;
};

/** 한 줄짜리 알림이 머무는 시간. 기본 4초는 읽고 나서도 한참 남아 있음 */
const SNACKBAR_MS = 2000;

export function TokenNotice({ token }: TokenNoticeProps) {
  const snackbar = useSnackbarAdapter();
  const [copied, setCopied] = useState(false);

  // 절대 주소로 보여줘야 사용자가 그대로 붙여 쓸 수 있음
  const url =
    typeof window === "undefined"
      ? `/lost/${token}`
      : `${window.location.origin}/lost/${token}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      snackbar.create({
        timeout: SNACKBAR_MS,
        render: () => (
          <Snackbar variant="positive" message="주소를 복사했어요" onClick={snackbar.dismiss} />
        ),
      });
    } catch {
      // 클립보드가 막혀도 주소를 눈으로 읽어 옮길 수 있어 이동은 열어 둠
      snackbar.create({
        timeout: SNACKBAR_MS,
        render: () => (
          <Snackbar
            variant="critical"
            message="복사가 막혔어요. 위 주소를 직접 옮겨 주세요"
            onClick={snackbar.dismiss}
          />
        ),
      });
    }
    // 복사 성공 여부와 무관하게 이동을 열어 줌
    setCopied(true);
  }, [url, snackbar]);

  return (
    <Screen>
      <AppHeader title="실종 신고 접수" home />

      <ScreenBody gap="x6">
        {/* 끝났다는 말을 먼저 함. 경고부터 보이면 잘못된 줄 알고 놀람 */}
        <VStack align="stretch" gap="x2">
          <Icon svg={<IconCheckmarkCircleFill />} size="x10" color="fg.brand" />
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            신고를 등록했어요
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            연락처를 받지 않아서 아래 주소가 유일한 확인 방법이에요.
            <br />
            잃어버리면 다시 찾을 수 없으니 메모나 메신저에 옮겨 두세요.
          </Text>
        </VStack>

        {/* 주소는 고칠 수 없는 값이라 입력 칸이 아니라 읽는 자리로 둠 */}
        <VStack
          align="stretch"
          gap="x3"
          px="x4"
          py="x4"
          borderRadius="r3"
          bg="bg.neutralWeak"
        >
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            내 신고 조회 주소
          </Text>
          {/* 긴 주소가 한 줄을 넘어가도 끊어 보여 줌 */}
          <Text textStyle="t4Regular" color="fg.neutral" style={{ overflowWrap: "anywhere" }}>
            {url}
          </Text>
        </VStack>
      </ScreenBody>

      {/* 가장 먼저 할 일은 복사. 복사해야 다음으로 넘어갈 수 있음 */}
      <VStack align="stretch" gap="x2" px="spacingX.globalGutter" pt="x3" className="rebirth-bottom-bar">
        <ActionButton variant="brandSolid" size="large" onClick={copy}>
          {copied ? "복사했어요" : "주소 복사하기"}
        </ActionButton>

        {copied ? (
          <ActionButton variant="ghost" size="large" asChild>
            <Link href={`/lost/${token}`}>확인할 후보 보기</Link>
          </ActionButton>
        ) : (
          <HStack justify="center" py="x2">
            <Text textStyle="t3Regular" color="fg.neutralSubtle">
              복사하면 후보를 볼 수 있어요
            </Text>
          </HStack>
        )}
      </VStack>
    </Screen>
  );
}
