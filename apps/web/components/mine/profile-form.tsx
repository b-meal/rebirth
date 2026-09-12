"use client";

import { useActionState, useEffect, useRef } from "react";
import { Icon, VStack } from "@seed-design/react";
import { IconPersonFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";
import { Callout } from "seed-design/ui/callout";
import { Snackbar, SnackbarAvoidOverlap, useSnackbarAdapter } from "seed-design/ui/snackbar";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { AppHeader } from "@/components/ui/app-header";
import { Screen } from "@/components/ui/screen";
import { useFocusError } from "@/hooks/use-focus-error";
import { saveProfile, type ActionState } from "@/app/mine/actions";

// 프로필 수정. 사진은 제공자에서 온 값이라 여기서 바꾸지 않음
// 이름은 커뮤니티 글·댓글의 작성자로 나가는 값. 제보는 익명이라 쓰이지 않음

export type ProfileFormProps = {
  displayName: string;
  avatarUrl: string | null;
};

/** 한 줄짜리 알림이 머무는 시간. 기본 4초는 읽고 나서도 한참 남아 있음 */
const SNACKBAR_MS = 2000;

export function ProfileForm({ displayName, avatarUrl }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfile, {});
  const errors = state.errors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusError(formRef, state);

  // 저장했다는 말은 잠깐 알리고 사라지면 됨. 화면에 남겨 두면 다음에 눌러도 이미 떠 있어 바뀐 줄 모름
  // 액션이 부를 때마다 새 객체를 돌려줘 같은 결과가 또 와도 다시 알림
  const snackbar = useSnackbarAdapter();
  const shown = useRef<ActionState | null>(null);
  useEffect(() => {
    if (!state.ok || shown.current === state) return;
    shown.current = state;
    snackbar.create({
      timeout: SNACKBAR_MS,
      render: () => (
        <Snackbar variant="positive" message="저장했어요" onClick={snackbar.dismiss} />
      ),
    });
  }, [state, snackbar]);

  return (
    <Screen>
      <AppHeader title="프로필 수정" />

      {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
      {/* 저장 버튼이 화면 아래에 붙어 있어야 해 form 이 화면 전체를 감쌈 */}
      <VStack asChild align="stretch" grow={1} minHeight="0">
        <form ref={formRef} action={action}>
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
                errorMessage={errors.displayName}
                invalid={Boolean(errors.displayName)}
              >
                {/* 이 화면에 적을 칸이 이것 하나뿐이라 들어오자마자 손이 닿게 함
                    키보드가 올라와도 가릴 것이 없음 */}
                <TextFieldInput autoFocus placeholder="이름을 입력해 주세요" />
              </TextField>

              {/* 저장에 실패하면 무언가 해야 하므로 화면에 남김
                  스낵바로 두면 몇 초 뒤 사라져 무엇이 잘못됐는지 알 길이 없음 */}
              {state.error ? <Callout tone="critical" description={state.error} /> : null}
            </VStack>
          </VStack>

          {/* 돌아가기는 헤더의 뒤로 가기와 같은 일을 해 두지 않음 */}
          {/* pb 는 유틸이 안전 영역을 더해 다시 잡으므로 여기서 주지 않음 */}
          {/* 저장했다는 알림이 이 버튼을 덮지 않도록 띠 높이를 재게 함 */}
          <SnackbarAvoidOverlap>
            <VStack
              className="rebirth-bottom-bar"
              position="sticky"
              bottom="0"
              zIndex={1}
              align="stretch"
              px="spacingX.globalGutter"
              pt="x3"
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
          </SnackbarAvoidOverlap>
        </form>
      </VStack>
    </Screen>
  );
}
