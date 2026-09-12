"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Box, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";

import { BODY_MAX, TITLE_MAX, type CategoryDescriptor } from "@rebirth/core/community";

import { createPost, type PostFormState } from "@/app/community/actions";
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

export function PostForm({ category }: { category: CategoryDescriptor }) {
  const [state, formAction] = useActionState<PostFormState, FormData>(
    createPost,
    {},
  );
  const [dirty, setDirty] = useState(false);
  const errors = state.errors ?? {};

  // 쓰던 글이 있으면 새로고침과 탭 닫기를 되묻게 함
  useUnsavedWarning(dirty);

  return (
    <Screen>
      <AppHeader title="글쓰기" />
      <ScreenBody gap="x6">
        <VStack align="stretch" gap="x2">
          <Box alignSelf="flex-start" px="x2" py="x0_5" borderRadius="r1" bg="bg.neutralWeak">
            <Text textStyle="t1Bold" color="fg.neutralMuted">
              {category.label}
            </Text>
          </Box>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            이웃이 함께 보는 글이에요
          </Text>
        </VStack>

        {state.message ? (
          <Callout tone="critical" description={state.message} />
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

            <TextField
              label="동네"
              description="동 이름만 남아요. 정확한 위치는 저장하지 않아요"
              errorMessage={errors.areaName}
              invalid={Boolean(errors.areaName)}
            >
              <TextFieldInput name="areaName" placeholder="예: 중곡동" />
            </TextField>

            <SubmitButton />
          </VStack>
        </form>
      </ScreenBody>
    </Screen>
  );
}
