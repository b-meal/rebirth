"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Icon, Text, VStack } from "@seed-design/react";
import { IconCheckmarkCircleFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

// 조회 토큰을 한 번만 보여줌, 복사를 주요 동작으로 두고 저장소에는 남기지 않음
// 신고는 이미 끝났으므로 먼저 끝났다고 말하고, 주소를 왜 챙겨야 하는지 한 줄로만 밝힘

export type TokenNoticeProps = {
  token: string;
  /** 복사를 마치고 조회 화면으로 넘어갈 때. 이 화면은 폼 안에서 그려져 폼이 직접 옮김 */
  onLeave: () => void;
};

/** 한 줄짜리 알림이 머무는 시간. 기본 4초는 읽고 나서도 한참 남아 있음 */
const SNACKBAR_MS = 2000;

export function TokenNotice({ token, onLeave }: TokenNoticeProps) {
  const snackbar = useSnackbarAdapter();
  // 복사가 막힌 경우에만 직접 옮길 길을 남김
  const [blocked, setBlocked] = useState(false);

  // 절대 주소로 보여줘야 사용자가 그대로 붙여 쓸 수 있음
  const url =
    typeof window === "undefined"
      ? `/lost/${token}`
      : `${window.location.origin}/lost/${token}`;

  // 토큰 앞뒤만 남겨 줄인 모양. 복사되는 값은 늘 전체 주소임
  const masked = `${url.slice(0, url.length - token.length + 6)}…${token.slice(-4)}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드가 막히면 눈으로 읽어 옮겨야 하므로 이 화면에 그대로 둠
      // 여기서 넘어가 버리면 적어 둘 기회를 뺏음
      setBlocked(true);
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
      return;
    }

    // 복사가 끝났으면 할 일이 없는 화면이라 바로 넘어감
    // 주소는 넘어간 화면의 주소창에 그대로 남아 있어 잃어버리지 않음
    snackbar.create({
      timeout: SNACKBAR_MS,
      render: () => (
        <Snackbar variant="positive" message="주소를 복사했어요" onClick={snackbar.dismiss} />
      ),
    });
    onLeave();
  }, [url, snackbar, onLeave]);

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

        {/* 토큰은 사람이 읽거나 외울 값이 아니라 앞뒤만 보여 주소가 있다는 것만 알림
            전부 펼치면 두 줄을 먹고 그만큼 중요해 보이지만 읽을 일은 없음
            복사가 막힌 기기에서는 눈으로 옮겨 적어야 해 그때만 전부 펼침 */}
        <VStack align="stretch" gap="x2" px="x4" py="x4" borderRadius="r3" bg="bg.neutralWeak">
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            내 신고 조회 주소
          </Text>
          <Text textStyle="t4Regular" color="fg.neutral" style={{ overflowWrap: "anywhere" }}>
            {blocked ? url : masked}
          </Text>
        </VStack>
      </ScreenBody>

      {/* 복사하면 그대로 후보 화면으로 넘어감. 여기서 할 일이 더 없음 */}
      <VStack align="stretch" gap="x2" px="spacingX.globalGutter" pt="x3" className="rebirth-bottom-bar">
        <ActionButton variant="brandSolid" size="large" onClick={copy}>
          주소 복사하기
        </ActionButton>

        {/* 복사가 막힌 기기에서만 스스로 옮겨 적고 넘어갈 길을 둠 */}
        {blocked ? (
          <ActionButton variant="ghost" size="large" asChild>
            <Link href={`/lost/${token}`}>주소를 옮겨 적었어요</Link>
          </ActionButton>
        ) : null}
      </VStack>
    </Screen>
  );
}
