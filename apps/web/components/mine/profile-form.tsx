"use client";

import { useActionState } from "react";
import { Icon, VStack } from "@seed-design/react";
import { IconPersonFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { AppHeader } from "@/components/ui/app-header";
import { Screen } from "@/components/ui/screen";
import { saveProfile, type ActionState } from "@/app/mine/actions";

// 프로필 수정. 사진은 제공자에서 온 값이라 여기서 바꾸지 않음
// 이름은 커뮤니티 글·댓글의 작성자로 나가는 값. 제보는 익명이라 쓰이지 않음

export type ProfileFormProps = {
  displayName: string;
  avatarUrl: string | null;
};

export function ProfileForm({ displayName, avatarUrl }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfile, {});

  return (
    <Screen>
      <AppHeader title="프로필 수정" />

      {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
      {/* 저장 버튼이 화면 아래에 붙어 있어야 해 form 이 화면 전체를 감쌈 */}
      <VStack asChild align="stretch" grow={1} minHeight="0">
        <form action={action}>
          <VStack align="stretch" grow={1} px="spacingX.globalGutter" pt="x6" gap="x8">
            {/* 사진은 바꿀 수 있는 자리가 없어 설명을 두지 않음 */}
            {/* 누를 곳이 없으면 왜 못 바꾸는지 묻지 않음 */}
            <VStack align="center">
              <Avatar
                size="80"
                src={avatarUrl ?? undefined}
                alt=""
                fallback={<Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />}
              />
            </VStack>

            <VStack align="stretch" gap="x4">
              <TextField
                label="이름"
                name="displayName"
                size="medium"
                description="커뮤니티 글과 댓글에 보여요"
                defaultValue={displayName}
                maxGraphemeCount={20}
              >
                <TextFieldInput placeholder="이름을 입력해 주세요" />
              </TextField>

              {state.error ? <Callout tone="critical" description={state.error} /> : null}
              {state.ok ? <Callout tone="positive" description="저장했어요" /> : null}
            </VStack>
          </VStack>

          {/* 돌아가기는 헤더의 뒤로 가기와 같은 일을 해 두지 않음 */}
          <VStack
            position="sticky"
            bottom="0"
            zIndex={1}
            align="stretch"
            px="spacingX.globalGutter"
            pt="x3"
            pb="x5"
            bg="bg.layerDefault"
          >
            <ActionButton
              type="submit"
              variant="brandSolid"
              size="large"
              loading={pending}
              disabled={pending}
            >
              저장하기
            </ActionButton>
          </VStack>
        </form>
      </VStack>
    </Screen>
  );
}
