"use client";

import { useCallback, useState } from "react";
import { Icon, Text, VStack } from "@seed-design/react";
import { IconCheckmarkCircleFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";

import { Screen, ScreenBody } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

// 조회 토큰을 한 번만 보여줌, 복사를 주요 동작으로 두고 저장소에는 남기지 않음
// 복사와 이동은 각각 다른 버튼임, 복사 버튼이 화면까지 옮기면 누른 사람이 예상하지 못함

export type TokenNoticeProps = {
  token: string;
  /** 조회 화면으로 넘어갈 때. 이 화면은 폼 안에서 그려져 폼이 직접 옮김 */
  onLeave: () => void;
};

/** 한 줄짜리 알림이 머무는 시간. 기본 4초는 읽고 나서도 한참 남아 있음 */
const SNACKBAR_MS = 2000;

export function TokenNotice({ token, onLeave }: TokenNoticeProps) {
  const snackbar = useSnackbarAdapter();
  // 복사를 마쳤는지. 마쳐야 넘어가는 버튼이 열림
  const [copied, setCopied] = useState(false);
  // 클립보드가 막혔는지. 복사에 성공한 것과 다른 사실이라 따로 둠
  const [blocked, setBlocked] = useState(false);

  // 절대 주소로 보여줘야 사용자가 그대로 붙여 쓸 수 있음
  const url =
    typeof window === "undefined"
      ? `/lost/${token}`
      : `${window.location.origin}/lost/${token}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드가 막히면 눈으로 읽어 옮겨야 하므로 주소를 펼쳐 둠
      // 복사는 안 됐으므로 copied 는 세우지 않음
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

    setCopied(true);
    snackbar.create({
      timeout: SNACKBAR_MS,
      render: () => (
        <Snackbar variant="positive" message="복사했어요" onClick={snackbar.dismiss} />
      ),
    });
  }, [url, snackbar]);

  return (
    <Screen>
      <AppHeader title="실종 신고 접수" home />

      <ScreenBody gap="x6">
        {/* 끝났다는 말을 먼저 함. 경고부터 보이면 잘못된 줄 알고 놀람 */}
        <VStack align="stretch" gap="x2">
          <Icon svg={<IconCheckmarkCircleFill />} size="x10" color="fg.brand" />
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            신고를 접수했어요
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            이 주소로만 다시 볼 수 있어요. 꼭 저장해 두세요
          </Text>
        </VStack>

        {/* 복사가 막힌 기기에서만 눈으로 옮겨 적을 수 있게 전부 펼침 */}
        {blocked ? (
          <VStack align="stretch" px="x4" py="x4" borderRadius="r3" bg="bg.neutralWeak">
            <Text textStyle="t3Regular" color="fg.neutralMuted" style={{ overflowWrap: "anywhere" }}>
              {url}
            </Text>
          </VStack>
        ) : null}
      </ScreenBody>

      {/* 복사하기 전에는 복사가 유일한 할 일이라 버튼도 하나뿐임
          복사 버튼은 자리를 지키고 아래로 넘어갈 길이 열림
          미리 띄우면 저장을 건너뛰고 지나감
          클립보드가 막힌 기기는 위에 펼친 주소를 옮겨 적었을 테니 같이 열어 줌 */}
      <VStack align="stretch" gap="x2" px="spacingX.globalGutter" pt="x3" className="rebirth-bottom-bar">
        <ActionButton
          variant={copied || blocked ? "neutralWeak" : "brandSolid"}
          size="large"
          onClick={copy}
        >
          {copied ? "다시 복사하기" : "주소 복사하기"}
        </ActionButton>

        {copied || blocked ? (
          <ActionButton variant="brandSolid" size="large" onClick={onLeave}>
            확인할 후보 보기
          </ActionButton>
        ) : null}
      </VStack>
    </Screen>
  );
}
