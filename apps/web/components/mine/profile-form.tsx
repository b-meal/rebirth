"use client";

import Link from "next/link";
import { useActionState } from "react";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconPersonFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { AppHeader } from "@/components/ui/app-header";
import { Screen, SectionCard } from "@/components/ui/screen";
import { saveProfile, type ActionState } from "@/app/mine/actions";

// 프로필 수정. 사진은 제공자에서 온 값이라 여기서 바꾸지 않음
// 이름은 커뮤니티 글·댓글의 작성자로 나가는 값. 제보는 익명이라 쓰이지 않음

const PROVIDER_LABEL: Record<string, string> = { kakao: "카카오", google: "구글" };

export type ProfileFormProps = {
  displayName: string;
  avatarUrl: string | null;
  provider: string;
};

export function ProfileForm({ displayName, avatarUrl, provider }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfile, {});

  return (
    <Screen bg="bg.layerBasement">
      <AppHeader title="프로필 수정" />

      <VStack align="stretch" gap="x2" pb="x10">
        <SectionCard gap="x4">
          <VStack align="center" gap="x2">
            <Avatar
              size="80"
              src={avatarUrl ?? undefined}
              alt=""
              fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />}
            />
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              사진은 {PROVIDER_LABEL[provider] ?? "SNS"} 계정에서 가져옵니다
            </Text>
          </VStack>

          {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
          <form action={action}>
            <VStack align="stretch" gap="x4">
              <TextField
                label="이름"
                name="displayName"
                size="medium"
                description="커뮤니티 글과 댓글에 표시돼요. 제보에는 보이지 않아요"
                defaultValue={displayName}
                maxGraphemeCount={20}
              >
                <TextFieldInput placeholder="이름을 입력해 주세요" />
              </TextField>

              {state.error ? <Callout tone="critical" description={state.error} /> : null}
              {state.ok ? <Callout tone="positive" description="저장했습니다" /> : null}

              <HStack gap="x2" align="stretch">
                <ActionButton variant="neutralWeak" size="large" flexGrow={1} asChild>
                  <Link href="/mine">돌아가기</Link>
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="brandSolid"
                  size="large"
                  flexGrow={1}
                  loading={pending}
                  disabled={pending}
                >
                  저장
                </ActionButton>
              </HStack>
            </VStack>
          </form>
        </SectionCard>
      </VStack>
    </Screen>
  );
}
