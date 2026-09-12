"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";

// 조회 토큰을 한 번만 보여줌, 복사를 주요 동작으로 두고 저장소에는 남기지 않음

export type TokenNoticeProps = {
  token: string;
};

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
        onClose: () => {},
        render: () => <Snackbar variant="positive" message="조회 주소를 복사했습니다" />,
      });
    } catch {
      // 클립보드가 막혀도 입력란에서 직접 복사할 수 있어 이동은 열어 둠
      snackbar.create({
        onClose: () => {},
        render: () => (
          <Snackbar variant="critical" message="자동 복사가 막혔습니다. 위 입력란의 주소를 직접 복사해 주십시오" />
        ),
      });
    }
    // 복사 성공 여부와 무관하게 이동을 열어 줌
    setCopied(true);
  }, [url, snackbar]);

  return (
    <Screen>
      <AppHeader title="실종 신고 접수" home />
      <ScreenBody gap="x5">
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          신고를 등록했습니다
        </Text>

        <Callout
          tone="warning"
          description="이 주소를 잃으면 신고를 다시 찾을 수 없습니다. 반드시 복사해 두십시오"
        />

        <Section>
          <TextField label="내 신고 조회 주소" value={url} readOnly>
            <TextFieldInput readOnly onFocus={(event) => event.target.select()} />
          </TextField>
          <ActionButton variant="brandSolid" size="large" onClick={copy}>
            {copied ? "복사했습니다" : "주소 복사하기"}
          </ActionButton>
        </Section>

        <Text textStyle="t3Regular" color="fg.neutralMuted">
          연락처를 받지 않으므로 이 주소가 유일한 확인 수단입니다. 메모나 메신저에 보내
          두시면 안전합니다
        </Text>

        {/* 복사 전에는 이동을 막음 */}
        {copied ? (
          <ActionButton variant="neutralOutline" size="large" asChild>
            <Link href={`/lost/${token}`}>확인할 후보 보기</Link>
          </ActionButton>
        ) : (
          <ActionButton variant="neutralOutline" size="large" disabled>
            주소를 복사하면 이동할 수 있습니다
          </ActionButton>
        )}
      </ScreenBody>
    </Screen>
  );
}
