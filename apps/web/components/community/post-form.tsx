"use client";

import { useActionState, useEffect, useState } from "react";
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

export function PostForm({ category }: { category: CategoryDescriptor }) {
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

  // 위치가 늦게 들어와도 채우려면 필드를 다시 마운트해야 함
  // 사용자가 한 번이라도 고쳤으면 그 값이 이겨 덮어쓰지 않음
  const [touched, setTouched] = useState(false);
  const filled = touched ? null : areaName;

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
              description={
                blocked
                  ? "위치를 켜면 자동으로 채워져요"
                  : "동 이름만 남아요. 정확한 위치는 저장하지 않아요"
              }
              errorMessage={errors.areaName}
              invalid={Boolean(errors.areaName)}
            >
              {/* 위치가 늦게 오므로 값이 바뀌면 key 로 다시 마운트해 채움 */}
              <TextFieldInput
                key={filled ?? "empty"}
                name="areaName"
                defaultValue={filled ?? ""}
                placeholder="예: 중곡동"
                onChange={() => setTouched(true)}
              />
            </TextField>

            {blocked ? (
              <ActionButton variant="neutralWeak" size="medium" onClick={retry}>
                위치 켜서 동네 채우기
              </ActionButton>
            ) : null}

            <SubmitButton />
          </VStack>
        </form>
      </ScreenBody>
    </Screen>
  );
}
