"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";

import {
  BODY_MAX,
  COMMUNITY_CATEGORIES,
  TITLE_MAX,
} from "@rebirth/core/community";

import { createPost, type PostFormState } from "@/app/community/actions";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";

// 글쓰기. 주제를 고르고 제목과 내용을 쓰는 세 칸이 전부
// 주제 목록은 core 에서 오므로 이 화면은 주제를 모름

/** 폼 안에서만 제출 상태를 읽을 수 있어 버튼을 따로 둠 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <ActionButton type="submit" variant="brandSolid" size="large" loading={pending}>
      올리기
    </ActionButton>
  );
}

export function PostForm() {
  const [state, formAction] = useActionState<PostFormState, FormData>(
    createPost,
    {},
  );
  const errors = state.errors ?? {};

  return (
    <Screen>
      <ScreenBody gap="x6">
        <VStack align="stretch" gap="x1">
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            글쓰기
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            이웃이 함께 볼 수 있는 글입니다
          </Text>
        </VStack>

        {state.message ? (
          <Callout tone="critical" description={state.message} />
        ) : null}

        <form action={formAction}>
          <VStack align="stretch" gap="x6">
            <Section gap="x2">
              <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                주제
              </Text>
              <Chip.RadioRoot name="category" defaultValue={COMMUNITY_CATEGORIES[0]?.id}>
                <HStack gap="spacingX.betweenChips" wrap>
                  {COMMUNITY_CATEGORIES.map((option) => (
                    <Chip.RadioItem key={option.id} value={option.id}>
                      <Chip.Label>{option.label}</Chip.Label>
                    </Chip.RadioItem>
                  ))}
                </HStack>
              </Chip.RadioRoot>
              {errors.category ? (
                <Text textStyle="t2Regular" color="fg.critical">
                  {errors.category}
                </Text>
              ) : null}
            </Section>

            <TextField
              label="제목"
              maxGraphemeCount={TITLE_MAX}
              errorMessage={errors.title}
              invalid={Boolean(errors.title)}
            >
              <TextFieldInput name="title" placeholder="제목을 입력해 주십시오" />
            </TextField>

            <TextField
              label="내용"
              maxGraphemeCount={BODY_MAX}
              errorMessage={errors.body}
              invalid={Boolean(errors.body)}
            >
              {/* autoresize 가 기본이라 줄 수를 고정하지 않음 */}
              <TextFieldTextarea
                name="body"
                placeholder="이웃과 나누고 싶은 이야기를 써 주십시오"
              />
            </TextField>

            <TextField
              label="동네"
              description="동 이름만 남습니다. 정확한 위치는 저장하지 않습니다"
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
