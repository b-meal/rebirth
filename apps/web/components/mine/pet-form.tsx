"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { HStack, Text, VStack } from "@seed-design/react";
import { PHOTO_MAX_COUNT } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { AppHeader } from "@/components/ui/app-header";
import { PhotoField } from "@/components/ui/photo-field";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { useFocusError } from "@/hooks/use-focus-error";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUploads } from "@/hooks/use-photo-uploads";
import { addPet, type ActionState } from "@/app/mine/actions";

// 우리 동물 등록. 실종 신고를 빠르게 채우려고 미리 적어 두는 기록

/** 한 줄짜리 알림이 머무는 시간. 기본 4초는 읽고 나서도 한참 남아 있음 */
const SNACKBAR_MS = 2000;

const ANIMAL_OPTIONS = [
  { value: "dog", label: "개" },
  { value: "cat", label: "고양이" },
  { value: "other", label: "그 외" },
] as const;

const SIZE_OPTIONS = [
  { value: "small", label: "소형" },
  { value: "medium", label: "중형" },
  { value: "large", label: "대형" },
] as const;

const COLOR_OPTIONS = ["흰색", "검정색", "갈색", "회색", "노란색", "얼룩"] as const;

export function PetForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(addPet, {});
  const errors = state.errors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusError(formRef, state);

  // 여러 장을 각자 올림. use-photo-upload 는 새로 올릴 때 앞의 것을 끊어 한 장만 남음
  const upload = usePhotoUploads();
  const snackbar = useSnackbarAdapter();
  const picker = usePhotoPicker({
    maxCount: PHOTO_MAX_COUNT,
    onChange: upload.sync,
    // 같은 사진을 또 고르면 아무 일도 안 일어난 것처럼 보여 스낵바로 알림
    onDuplicate: (count) =>
      snackbar.create({
        timeout: SNACKBAR_MS,
        render: () => (
          <Snackbar
            variant="critical"
            onClick={snackbar.dismiss}
            message={
              count === 1 ? "이미 고른 사진이에요" : `이미 고른 사진 ${count}장은 넣지 않았어요`
            }
          />
        ),
      }),
  });

  // 저장이 끝나면 마이페이지로 돌려보내 방금 넣은 기록을 바로 보게 함
  useEffect(() => {
    if (state.ok) router.push("/mine");
  }, [state.ok, router]);

  return (
    <Screen>
      <AppHeader title="우리 동물 등록" />

      {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
      <form ref={formRef} action={action}>
        <ScreenBody gap="x6">
          {/* 왜 적는지 먼저 말함. 입력란마다 이유를 달면 같은 말을 여덟 번 되풀이하게 됨 */}
          <VStack align="stretch" gap="x1">
            <Text as="h1" textStyle="t7Bold" color="fg.neutral">
              우리 동물을 미리 적어 두세요
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              잃어버린 날 급하게 찾아 헤매지 않아도 돼요
            </Text>
          </VStack>

          {/* 머리글이 이미 무엇을 적는지 말해 사진과 이름은 이름표만 둠 */}
          <PhotoField
            picker={picker}
            label="사진"
            hint="얼굴이 잘 보이는 사진일수록 찾기 쉬워요"
            cameraAvailable={false}
            uploading={upload.status === "uploading"}
            disabled={upload.status === "uploading"}
          />
          {upload.uploadId ? (
            <input type="hidden" name="uploadId" value={upload.uploadId} />
          ) : null}
          {upload.message ? <Callout tone="critical" description={upload.message} /> : null}

          <TextField
            label="이름"
            name="name"
            size="medium"
            maxGraphemeCount={20}
            errorMessage={errors.name}
            invalid={Boolean(errors.name)}
          >
            <TextFieldInput placeholder="보리" />
          </TextField>

          {/* 여기서부터는 비워도 등록됨. 칸마다 적지 않고 묶음 머리에 한 번만 밝힘 */}
          <HStack justify="space-between" align="center">
            <Text as="h2" textStyle="t5Bold" color="fg.neutral">
              생김새
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralSubtle">
              아는 만큼만
            </Text>
          </HStack>

          <Section>
            <Text as="h3" textStyle="t5Bold" color="fg.neutral">
              동물 종류
            </Text>
            <SegmentedControl name="animalType" defaultValue="dog" aria-label="동물 종류">
              {ANIMAL_OPTIONS.map((option) => (
                <SegmentedControlItem key={option.value} value={option.value}>
                  {option.label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Section>

          <Section>
            <Text as="h3" textStyle="t5Bold" color="fg.neutral">
              크기
            </Text>
            <SegmentedControl name="size" defaultValue="small" aria-label="크기">
              {SIZE_OPTIONS.map((option) => (
                <SegmentedControlItem key={option.value} value={option.value}>
                  {option.label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Section>

          {/* 칩의 체크박스는 숨어 있어 오류가 나면 이 줄을 대신 찾아 옮김 */}
          <Section data-error-anchor="colors" tabIndex={-1}>
            <Text as="h3" textStyle="t5Bold" color="fg.neutral">
              털색
            </Text>
            <HStack gap="spacingX.betweenChips" wrap>
              {COLOR_OPTIONS.map((color) => (
                <Chip.Toggle
                  key={color}
                  size="small"
                  // 값은 숨은 체크박스가 실어 보내므로 이름과 값을 그쪽에 줌
                  inputProps={{ name: "colors", value: color }}
                >
                  <Chip.Label>{color}</Chip.Label>
                </Chip.Toggle>
              ))}
            </HStack>
            {/* 칩 줄에는 오류를 붙일 입력 칸이 없어 바로 아래에 둠 */}
            {errors.colors ? (
              <Text textStyle="t3Regular" color="fg.critical">
                {errors.colors}
              </Text>
            ) : null}
          </Section>

          <TextField
            label="품종"
            name="breedGuess"
            size="medium"
            maxGraphemeCount={30}
            errorMessage={errors.breedGuess}
            invalid={Boolean(errors.breedGuess)}
          >
            <TextFieldInput placeholder="말티즈" />
          </TextField>

          <TextField
            label="특징"
            name="note"
            size="medium"
            maxGraphemeCount={100}
            errorMessage={errors.note}
            invalid={Boolean(errors.note)}
          >
            <TextFieldInput placeholder="빨간 목줄, 사람을 잘 따름" />
          </TextField>

          {/* 저장 자체가 실패한 경우. 칸별 오류는 각 칸 아래에 이미 붙어 있음 */}
          {state.error ? <Callout tone="critical" description={state.error} /> : null}

          {/* 돌아가기는 헤더의 뒤로 가기와 같은 일을 해 두지 않음 */}
          <HStack align="stretch">
            <ActionButton
              type="submit"
              variant="brandSolid"
              size="large"
              flexGrow={1}
              loading={pending}
              disabled={pending || upload.status === "uploading"}
            >
              등록하기
            </ActionButton>
          </HStack>
        </ScreenBody>
      </form>
    </Screen>
  );
}
