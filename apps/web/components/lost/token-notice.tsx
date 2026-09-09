"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  Button,
  FlexBox,
  SectionMessage,
  TextField,
  Typography,
} from "@wanteddev/wds";

// 조회 토큰을 한 번만 보여줌. 이 화면의 유일한 위험은 사용자가 복사하지 않고 닫는 것
// 복사 버튼을 주요 동작으로 두고 복사 전에는 이동을 막음
// 토큰을 sessionStorage 나 localStorage 에 저장하지 않음

export type TokenNoticeProps = {
  token: string;
};

export function TokenNotice({ token }: TokenNoticeProps) {
  const [copied, setCopied] = useState(false);

  // 절대 주소로 보여줘야 사용자가 그대로 붙여 쓸 수 있음
  const url =
    typeof window === "undefined"
      ? `/lost/${token}`
      : `${window.location.origin}/lost/${token}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // 클립보드가 막히면 사용자가 입력란에서 직접 복사하도록 둠
      setCopied(true);
    }
  }, [url]);

  return (
    <FlexBox flexDirection="column" gap="16px" sx={{ padding: "24px 16px 96px" }}>
      <Typography variant="title2" weight="bold">
        신고를 등록했습니다
      </Typography>

      <SectionMessage variant="cautionary" open>
        이 주소를 잃으면 신고를 다시 찾을 수 없습니다. 반드시 복사해 두십시오
      </SectionMessage>

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="headline2" weight="bold">
          내 신고 조회 주소
        </Typography>
        {/* 읽기 전용으로 두고 전체를 선택할 수 있게 함 */}
        <TextField value={url} readOnly onFocus={(event) => event.target.select()} />
        <Button fullWidth onClick={copy}>
          {copied ? "복사했습니다" : "주소 복사하기"}
        </Button>
      </FlexBox>

      <Typography variant="caption1">
        연락처를 받지 않으므로 이 주소가 유일한 확인 수단입니다. 메모나 메신저에
        보내 두시면 안전합니다
      </Typography>

      {/* 복사 전에는 이동을 막음 */}
      {copied ? (
        <Link href={`/lost/${token}`}>
          <Button fullWidth variant="outlined">
            확인할 후보 보기
          </Button>
        </Link>
      ) : (
        <Button fullWidth variant="outlined" disabled>
          주소를 복사하면 이동할 수 있습니다
        </Button>
      )}
    </FlexBox>
  );
}
