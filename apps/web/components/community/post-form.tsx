"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";

import { BODY_MAX, TITLE_MAX, type CategoryDescriptor } from "@rebirth/core/community";

import { createPost, type PostFormState } from "@/app/community/actions";
import { useNeighborhood } from "@/components/location/neighborhood-provider";
import { AppHeader } from "@/components/ui/app-header";
import { Screen, ScreenBody } from "@/components/ui/screen";
import { useUnsavedWarning } from "@/hooks/use-unsaved-warning";

// 글쓰기. 주제는 앞의 바텀시트에서 고르고 여기서는 제목과 내용만 물음
// 한 화면에 한 가지만 묻는 편이 모바일 키보드 위에서 읽기 쉬움

/** 폼 안에서만 제출 상태를 읽을 수 있어 버튼을 따로 둠 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <ActionButton type="submit" variant="brandSolid" size="large" loading={pending}>
      올리기
    </ActionButton>
  );
}

/**
 * 입력 칸 묶음. 전체 화면과 모달이 같은 폼을 나눠 씀
 * 껍데기만 다르고 검증과 저장은 한 곳이라 두 길이 어긋나지 않음
 */
export function PostFormFields({ category }: { category: CategoryDescriptor }) {
  const [state, formAction] = useActionState<PostFormState, FormData>(
    createPost,
    {},
  );
  const [dirty, setDirty] = useState(false);
  const errors = state.errors ?? {};

  const { areaName, blocked, ensure, retry } = useNeighborhood();

  // 시트를 거치지 않고 주소로 바로 들어올 수 있어 여기서도 물음
  useEffect(() => {
    ensure();
  }, [ensure]);

  // 쓰던 글이 있으면 새로고침과 탭 닫기를 되묻게 함
  useUnsavedWarning(dirty);

  return (
    <>
      {/* 주제와 동네는 한 줄로 둠. 둘 다 이 글이 어디에 걸리는지를 말하는 값
          주제를 바꾸는 일은 앱바의 뒤로가 맡으므로 여기서는 무엇을 고른지만 보여 줌 */}
      <HStack align="center" gap="x2">
        <Box px="x2" py="x0_5" borderRadius="r1" bg="bg.neutralWeak">
          <Text textStyle="t1Bold" color="fg.neutralMuted">
            {category.label}
          </Text>
        </Box>
        {/* 어느 동네에 걸리는지는 알려 주되 고치게 하지는 않음
            동네를 모르면 줄 자체를 비움. 확인 중이라는 말은 곧 사라질 문장이라 자리만 차지함 */}
        {areaName ? (
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {areaName} 이웃들에게 보여요
          </Text>
        ) : null}
      </HStack>

      {/* 동네는 입력 칸이 없어 오류를 붙일 자리도 없음. 여기로 모아 보여 줌 */}
      {state.message || errors.areaName ? (
        <Callout tone="critical" description={state.message ?? errors.areaName} />
      ) : null}

      <form action={formAction} onChange={() => setDirty(true)}>
        <VStack align="stretch" gap="x6">
          {/* 주제는 앞 화면에서 이미 골랐으므로 값만 싣고 배지로만 보여 줌 */}
          <input type="hidden" name="category" value={category.id} />

          <TextField
            label="제목"
            maxGraphemeCount={TITLE_MAX}
            errorMessage={errors.title}
            invalid={Boolean(errors.title)}
          >
            <TextFieldInput name="title" placeholder="어떤 이야기인가요" />
          </TextField>

          <TextField
            label="내용"
            maxGraphemeCount={BODY_MAX}
            errorMessage={errors.body}
            invalid={Boolean(errors.body)}
          >
            {/* autoresize 가 기본이라 줄 수를 고정하지 않음 */}
            {/* 고른 주제의 힌트를 그대로 써 무엇을 쓸지 한 번 더 알려 줌 */}
            <TextFieldTextarea name="body" placeholder={category.hint} />
          </TextField>

          {/* design-system-allow:raw-element 보이지 않는 hidden 필드라 SEED 에 대응 컴포넌트가 없음 */}
          {/* 동네는 손으로 고치지 않음. 읽는 쪽이 내 위치로 거르므로 적어 낸 동과 어긋나면 글이 어디에도 안 보임 */}
          <input type="hidden" name="areaName" value={areaName ?? ""} />

          {blocked ? (
            <ActionButton variant="neutralWeak" size="medium" onClick={retry}>
              위치 켜서 동네 붙이기
            </ActionButton>
          ) : null}

          <SubmitButton />
        </VStack>
      </form>
    </>
  );
}

/** 주소로 바로 열었을 때 쓰는 전체 화면. 모달은 같은 폼을 시트 안에 둠 */
export function PostForm({ category }: { category: CategoryDescriptor }) {
  return (
    <Screen>
      <AppHeader title="글쓰기" />
      <ScreenBody gap="x6">
        <PostFormFields category={category} />
      </ScreenBody>
    </Screen>
  );
}
