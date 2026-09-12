"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  Grid,
  HStack,
  Icon,
  ImageFrame,
  ImageFrameFloater,
  Text,
  VStack,
} from "@seed-design/react";
import { IconXmarkFill } from "@karrotmarket/react-monochrome-icon";
import { PET_NOTE_MAX, PHOTO_MAX_COUNT } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";

import { AppHeader } from "@/components/ui/app-header";
import { PhotoField } from "@/components/ui/photo-field";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { useFocusError } from "@/hooks/use-focus-error";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUploads } from "@/hooks/use-photo-uploads";
import { addPet, editPet, type ActionState } from "@/app/mine/actions";

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

export type PetFormValues = {
  id: string;
  name: string;
  animalType: string;
  breedGuess: string | null;
  size: string;
  colors: string[];
  note: string | null;
  /** 이미 올려 둔 사진. 경로와 보여 줄 서명 주소를 짝지어 둠 */
  photos: { path: string; url: string }[];
};

export type PetFormProps = {
  /** 고칠 기록. 없으면 새로 등록하는 화면 */
  pet?: PetFormValues;
};

export function PetForm({ pet }: PetFormProps) {
  const router = useRouter();
  const editing = pet !== undefined;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    editing ? editPet : addPet,
    {},
  );
  const errors = state.errors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusError(formRef, state);

  // 이미 올려 둔 사진은 File 이 아니라 고르는 칸에 넣을 수 없어 따로 들고 뺄 수만 있게 함
  const [kept, setKept] = useState(pet?.photos ?? []);

  // TextField 는 글자 수를 세느라 안에서 value 를 쥐고 있어 defaultValue 를 같이 주면
  // controlled 와 uncontrolled 가 섞임. 고칠 값이 있는 칸은 이 화면이 값을 쥠
  const [name, setName] = useState(pet?.name ?? "");
  const [breedGuess, setBreedGuess] = useState(pet?.breedGuess ?? "");
  const [note, setNote] = useState(pet?.note ?? "");

  // 저장된 값이 unknown 이면 고를 수 있는 칸에 없어 기본값으로 되돌림
  const animalDefault = ANIMAL_OPTIONS.some((it) => it.value === pet?.animalType)
    ? pet!.animalType
    : "dog";
  const sizeDefault = SIZE_OPTIONS.some((it) => it.value === pet?.size) ? pet!.size : "small";

  // 여러 장을 각자 올림. use-photo-upload 는 새로 올릴 때 앞의 것을 끊어 한 장만 남음
  const upload = usePhotoUploads();
  const snackbar = useSnackbarAdapter();
  const picker = usePhotoPicker({
    // 남겨 둔 사진이 이미 자리를 차지해 그만큼 덜 고를 수 있음
    maxCount: Math.max(0, PHOTO_MAX_COUNT - kept.length),
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

  // 저장이 끝나면 방금 다룬 기록이 보이는 곳으로 돌려보냄
  useEffect(() => {
    if (!state.ok) return;
    router.push(pet ? `/mine/pets/${pet.id}` : "/mine");
    // 서버가 그린 상세를 다시 읽어 바뀐 값이 바로 보이게 함
    router.refresh();
  }, [state.ok, router, pet]);

  return (
    <Screen>
      {/* 고칠 때는 어느 아이를 다루는 중인지 제목이 말해 줌 */}
      <AppHeader title={pet ? `${pet.name} 정보` : "우리 동물 등록"} />

      {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
      {/* 저장 버튼이 화면 아래에 붙어 있어야 해 form 이 남은 높이를 다 받음 */}
      <VStack asChild align="stretch" grow={1} minHeight="0">
        <form ref={formRef} action={action}>
          <ScreenBody gap="x6">
            {editing ? <input type="hidden" name="id" value={pet.id} /> : null}

            {/* 왜 적는지 먼저 말함. 입력란마다 이유를 달면 같은 말을 여덟 번 되풀이하게 됨
              고칠 때는 무엇을 적는지 이미 알고 들어와 머리글을 두지 않음 */}
            {editing ? null : (
              <VStack align="stretch" gap="x1">
                <Text as="h1" textStyle="t7Bold" color="fg.neutral">
                  우리 동물을 미리 적어 두세요
                </Text>
                <Text textStyle="t3Regular" color="fg.neutralMuted">
                  잃어버린 날 급하게 찾아 헤매지 않아도 돼요
                </Text>
              </VStack>
            )}

            {/* 올려 둔 사진은 고르는 칸에 못 넣어 위에 따로 보여 주고 뺄 수만 있게 함 */}
            {kept.length > 0 ? (
              <VStack align="stretch" gap="x2">
                <Text textStyle="t5Bold" color="fg.neutral">
                  올려 둔 사진
                </Text>
                <Grid columns={3} gap="x2">
                  {kept.map((photo) => (
                    <ImageFrame
                      key={photo.path}
                      ratio={1}
                      src={photo.url}
                      alt=""
                      borderRadius="r3"
                      stroke
                    >
                      <ImageFrameFloater placement="top-end" offsetX="x2" offsetY="x2">
                        <ActionButton
                          variant="neutralSolid"
                          size="xsmall"
                          layout="iconOnly"
                          aria-label="이 사진 빼기"
                          onClick={() =>
                            setKept((rest) => rest.filter((it) => it.path !== photo.path))
                          }
                        >
                          <Icon svg={<IconXmarkFill />} />
                        </ActionButton>
                      </ImageFrameFloater>
                    </ImageFrame>
                  ))}
                </Grid>
                {/* 남긴 것만 실어 보냄. 뺀 경로는 서버가 스토리지에서도 지움 */}
                {kept.map((photo) => (
                  <input key={photo.path} type="hidden" name="keepPhotoPaths" value={photo.path} />
                ))}
              </VStack>
            ) : null}

            {/* 머리글이 이미 무엇을 적는지 말해 사진과 이름은 이름표만 둠
              첫 장이 목록에 걸리는 대표 사진이 됨 */}
            <PhotoField
              picker={picker}
              label={kept.length > 0 ? "사진 더 올리기" : "사진"}
              hint="얼굴이 잘 보이는 사진일수록 찾기 쉬워요"
              cameraAvailable={false}
              uploading={upload.uploading}
              disabled={upload.uploading || kept.length >= PHOTO_MAX_COUNT}
            />
            {/* 고른 차례대로 실어 보냄. 서버가 이 순서로 사진을 붙임 */}
            {upload.uploadIds.map((id) => (
              <input key={id} type="hidden" name="uploadIds" value={id} />
            ))}
            {upload.message ? <Callout tone="critical" description={upload.message} /> : null}

            <TextField
              label="이름"
              name="name"
              size="medium"
              maxGraphemeCount={20}
              value={name}
              onValueChange={(next) => setName(next.slicedValue)}
              errorMessage={errors.name}
              invalid={Boolean(errors.name)}
            >
              <TextFieldInput placeholder="보리" />
            </TextField>

            <Text as="h2" textStyle="t5Bold" color="fg.neutral">
              생김새
            </Text>

            <Section>
              <Text as="h3" textStyle="t5Bold" color="fg.neutral">
                동물 종류
              </Text>
              <SegmentedControl
                name="animalType"
                defaultValue={animalDefault}
                aria-label="동물 종류"
              >
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
              <SegmentedControl name="size" defaultValue={sizeDefault} aria-label="크기">
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
                    defaultChecked={pet?.colors.includes(color)}
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
              value={breedGuess}
              onValueChange={(next) => setBreedGuess(next.slicedValue)}
              errorMessage={errors.breedGuess}
              invalid={Boolean(errors.breedGuess)}
            >
              <TextFieldInput placeholder="말티즈" />
            </TextField>

            <TextField
              label="특징"
              name="note"
              size="medium"
              maxGraphemeCount={PET_NOTE_MAX}
              value={note}
              onValueChange={(next) => setNote(next.slicedValue)}
              errorMessage={errors.note}
              invalid={Boolean(errors.note)}
            >
              {/* 실종 신고의 특징과 같은 칸. 한 줄로 두면 길게 적을 때 앞이 안 보임 */}
              <TextFieldTextarea placeholder="빨간 목줄, 사람을 잘 따름" />
            </TextField>

            {/* 저장 자체가 실패한 경우. 칸별 오류는 각 칸 아래에 이미 붙어 있음 */}
            {state.error ? <Callout tone="critical" description={state.error} /> : null}
          </ScreenBody>

          {/* 칸이 많아 끝까지 내려가야 누를 수 있으면 어디까지 왔는지 알기 어려움
            돌아가기는 헤더의 뒤로 가기와 같은 일을 해 두지 않음
            pb 는 유틸이 안전 영역을 더해 다시 잡으므로 여기서 주지 않음 */}
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
              disabled={pending || upload.uploading}
            >
              {editing ? "수정하기" : "등록하기"}
            </ActionButton>
          </VStack>
        </form>
      </VStack>
    </Screen>
  );
}
