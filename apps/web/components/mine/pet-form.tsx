"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Badge,
  Grid,
  HStack,
  Icon,
  ImageFrame,
  ImageFrameFloater,
  Text,
  VStack,
} from "@seed-design/react";
import { IconXmarkFill } from "@karrotmarket/react-monochrome-icon";
import {
  PET_NOTE_MAX,
  PET_REGISTRATION_DIGITS,
  PHOTO_MAX_COUNT,
  animalSize,
  animalType as animalTypeSchema,
  createPet,
  fieldErrors,
  updatePet,
} from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { Snackbar, useSnackbarAdapter } from "seed-design/ui/snackbar";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";

import { AppHeader } from "@/components/ui/app-header";
import { COAT_COLORS, CoatColorPicker } from "@/components/ui/coat-color-picker";
import { PhotoField } from "@/components/ui/photo-field";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { useAnalyzePhoto } from "@/hooks/use-analyze-photo";
import { useCameraAvailable } from "@/hooks/use-camera-available";
import { useFocusError } from "@/hooks/use-focus-error";
import { usePetAiDraft, type PetAiField } from "@/hooks/use-pet-ai-draft";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUploads } from "@/hooks/use-photo-uploads";
import { addPet, editPet, type ActionState } from "@/app/mine/actions";
import { BreedSuggest } from "@/components/ui/breed-suggest";

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

/** 한 요청에 넣는 사진 수. 서버 상한과 같음 */
const ANALYZE_PHOTOS = 2;


export type PetFormValues = {
  id: string;
  name: string;
  animalType: string;
  breedGuess: string | null;
  size: string;
  colors: string[];
  registrationNumber: string | null;
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
  // 서버 액션과 같은 모양으로 보내기 전에 먼저 거름. 이름 하나 비어도 사진까지 실어 왕복하지 않음
  const [clientState, setClientState] = useState<ActionState>({});
  const shown = clientState.errors ? clientState : state;
  const errors = shown.errors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusError(formRef, shown);

  const validateBeforeSubmit = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const common = {
      name: data.get("name"),
      animalType: animalTypeSchema.catch("unknown").parse(data.get("animalType")),
      breedGuess: data.get("breedGuess"),
      size: animalSize.catch("unknown").parse(data.get("size")),
      colors: data.getAll("colors").map(String),
      registrationNumber: data.get("registrationNumber"),
      note: data.get("note"),
      uploadIds: data.getAll("uploadIds").map(String).filter(Boolean),
    };
    const parsed = editing
      ? updatePet.safeParse({
          ...common,
          id: data.get("id"),
          keepPhotoPaths: data.getAll("keepPhotoPaths").map(String).filter(Boolean),
        })
      : createPet.safeParse(common);
    if (parsed.success) {
      setClientState({});
      return;
    }
    event.preventDefault();
    setClientState({ errors: fieldErrors(parsed.error) });
  };

  // 이미 올려 둔 사진은 File 이 아니라 고르는 칸에 넣을 수 없어 따로 들고 뺄 수만 있게 함
  const [kept, setKept] = useState(pet?.photos ?? []);

  // TextField 는 글자 수를 세느라 안에서 value 를 쥐고 있어 defaultValue 를 같이 주면
  // controlled 와 uncontrolled 가 섞임. 고칠 값이 있는 칸은 이 화면이 값을 쥠
  const [name, setName] = useState(pet?.name ?? "");
  const [breedGuess, setBreedGuess] = useState(pet?.breedGuess ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(pet?.registrationNumber ?? "");
  const [note, setNote] = useState(pet?.note ?? "");

  // 저장된 값이 unknown 이면 고를 수 있는 칸에 없어 기본값으로 되돌림
  // AI 초안이 나중에 도착해 값을 바꾸므로 이 세 칸도 화면이 값을 쥠
  const [animalType, setAnimalType] = useState(
    ANIMAL_OPTIONS.some((it) => it.value === pet?.animalType) ? pet!.animalType : "dog",
  );
  const [size, setSize] = useState(
    SIZE_OPTIONS.some((it) => it.value === pet?.size) ? pet!.size : "small",
  );
  const [colors, setColors] = useState<string[]>(pet?.colors ?? []);

  // 여러 장을 각자 올림. use-photo-upload 는 새로 올릴 때 앞의 것을 끊어 한 장만 남음
  const upload = usePhotoUploads();
  const snackbar = useSnackbarAdapter();
  const cameraAvailable = useCameraAvailable();
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

  // 사진을 올리면 제보와 같은 분석을 걸어 생김새 칸을 미리 채움
  // 고치는 화면은 이미 적어 둔 값이 있어 덮지 않음. 사진 한 장 더 올렸다고 기록이 바뀌면 안 됨
  const ai = usePetAiDraft();
  const { apply: applyAi } = ai;

  // 결과가 오는 그 자리에서 칸을 채움. 이펙트로 status 를 지켜보면 렌더가 한 번 더 돎
  const analyze = useAnalyzePhoto({
    onDone: ({ draft }) => {
      const values = applyAi(draft, {
        animalOptions: ANIMAL_OPTIONS.map((it) => it.value),
        sizeOptions: SIZE_OPTIONS.map((it) => it.value),
        // 세 화면이 같은 목록을 써 베이지, 삼색도 그대로 고를 수 있음
        colorOptions: COAT_COLORS.map((it) => it.label),
      });
      if (values.animalType !== undefined) setAnimalType(values.animalType);
      if (values.size !== undefined) setSize(values.size);
      if (values.colors !== undefined) setColors(values.colors);
      if (values.breedGuess !== undefined) setBreedGuess(values.breedGuess);
    },
  });

  const { uploadIds } = upload;
  const { start: startAnalyze, clear: clearAnalyze } = analyze;

  // 같은 사진 묶음을 두 번 분석하지 않음
  const analyzedKey = useRef<string | null>(null);
  useEffect(() => {
    if (editing || uploadIds.length === 0) return;
    // 서버가 한 요청에 두 장까지 받음. 대표 사진부터 보냄
    const targets = uploadIds.slice(0, ANALYZE_PHOTOS);
    const key = targets.join(",");
    if (analyzedKey.current === key) return;
    analyzedKey.current = key;

    clearAnalyze();
    startAnalyze(targets);
  }, [editing, uploadIds, startAnalyze, clearAnalyze]);

  // 저장이 끝나면 방금 다룬 기록이 보이는 곳으로 돌려보냄
  useEffect(() => {
    if (!state.ok) return;
    router.push(pet ? `/mine/pets/${pet.id}` : "/mine");
    // 서버가 그린 상세를 다시 읽어 바뀐 값이 바로 보이게 함
    router.refresh();
  }, [state.ok, router, pet]);

  // 분석 상태를 한 줄로만 알림. 등록을 막는 일은 없어 오류 색을 쓰지 않음
  const aiNotice = (() => {
    if (editing) return null;
    if (analyze.status === "loading") return "사진에서 생김새를 읽고 있어요";
    if (analyze.status === "failed") return "생김새를 자동으로 못 채웠어요. 직접 골라 주세요";
    if (analyze.advice === "not-animal") {
      // 주인이 자기 동물을 올리는 자리라 못 알아봐도 등록을 막지 않음
      return "사진에서 동물을 찾지 못했어요. 직접 골라 주세요";
    }
    if (ai.applied && ai.filled.length > 0) {
      return "AI 가 채운 초안이에요. 다르면 고쳐 주세요";
    }
    return null;
  })();

  // 초안이 채웠고 아직 고치지 않은 칸에만 붙음
  const aiBadge = (field: PetAiField) =>
    ai.isFilled(field) ? (
      <Badge size="medium" variant="outline" tone="neutral">
        AI 초안
      </Badge>
    ) : null;

  return (
    <Screen>
      {/* 고칠 때는 어느 아이를 다루는 중인지 제목이 말해 줌 */}
      <AppHeader title={pet ? `${pet.name} 정보` : "우리 동물 등록"} />

      {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
      {/* 저장 버튼이 화면 아래에 붙어 있어야 해 form 이 남은 높이를 다 받음 */}
      <VStack asChild align="stretch" grow={1} minHeight="0">
        <form ref={formRef} action={action} onSubmit={validateBeforeSubmit}>
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
                        {/* 폼 안에서는 type 이 없으면 submit 이 되어 누르는 순간 저장이 돌아감 */}
                        <ActionButton
                          type="button"
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
              hint={
                editing
                  ? "얼굴이 잘 보이는 사진일수록 찾기 쉬워요"
                  : "사진을 찍으면 생김새를 먼저 채워 드려요"
              }
              // 확인이 끝나기 전에는 null. 사진 칸이 갈 곳을 단정하지 않게 그대로 넘김
              cameraAvailable={cameraAvailable}
              uploading={upload.uploading}
              disabled={upload.uploading || kept.length >= PHOTO_MAX_COUNT}
            />
            {/* 고른 차례대로 실어 보냄. 서버가 이 순서로 사진을 붙임 */}
            {upload.uploadIds.map((id) => (
              <input key={id} type="hidden" name="uploadIds" value={id} />
            ))}
            {upload.message ? <Callout tone="critical" description={upload.message} /> : null}

            {/* 분석은 거들 뿐이라 실패해도 등록을 막지 않음. 동물이 안 보여도 안내만 함 */}
            {aiNotice ? (
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                {aiNotice}
              </Text>
            ) : null}

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
              <HStack gap="x1_5" align="center">
                <Text as="h3" textStyle="t5Bold" color="fg.neutral">
                  동물 종류
                </Text>
                {aiBadge("animalType")}
              </HStack>
              <SegmentedControl
                name="animalType"
                value={animalType}
                onValueChange={(value) => {
                  setAnimalType(value);
                  ai.touch("animalType");
                }}
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
              <HStack gap="x1_5" align="center">
                <Text as="h3" textStyle="t5Bold" color="fg.neutral">
                  크기
                </Text>
                {aiBadge("size")}
              </HStack>
              <SegmentedControl
                name="size"
                value={size}
                onValueChange={(value) => {
                  setSize(value);
                  ai.touch("size");
                }}
                aria-label="크기"
              >
                {SIZE_OPTIONS.map((option) => (
                  <SegmentedControlItem key={option.value} value={option.value}>
                    {option.label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </Section>

            {/* 체크박스가 숨어 있어 오류가 나면 이 줄을 대신 찾아 옮김 */}
            <Section data-error-anchor="colors" tabIndex={-1}>
              <HStack gap="x1_5" align="center">
                <Text as="h3" textStyle="t5Bold" color="fg.neutral">
                  털색
                </Text>
                {aiBadge("colors")}
              </HStack>
              {/* AI 초안이 나중에 도착해 값을 바꾸므로 이 화면이 값을 쥠 */}
              <CoatColorPicker
                value={colors}
                onChange={(next) => {
                  setColors(next);
                  ai.touch("colors");
                }}
              />
              {/* 통제 모드의 체크박스는 name 을 달지 않아 폼에 실리지 않음
                이 화면은 서버 액션에 FormData 로 보내므로 고른 값을 따로 실어 보냄 */}
              {colors.map((color) => (
                <input key={color} type="hidden" name="colors" value={color} />
              ))}
              {/* 색 줄에는 오류를 붙일 입력 칸이 없어 바로 아래에 둠 */}
              {errors.colors ? (
                <Text textStyle="t3Regular" color="fg.critical">
                  {errors.colors}
                </Text>
              ) : null}
            </Section>

            {/* 품종은 단정하지 않음. 라벨과 설명이 추정임을 먼저 말함 */}
            <TextField
              label="품종 추정"
              name="breedGuess"
              size="medium"
              indicator={ai.isFilled("breedGuess") ? "AI 초안" : undefined}
              description="계열 추정으로만 적어요. 모르면 비워 두세요"
              maxGraphemeCount={30}
              value={breedGuess}
              onValueChange={(next) => {
                setBreedGuess(next.slicedValue);
                ai.touch("breedGuess");
              }}
              errorMessage={errors.breedGuess}
              invalid={Boolean(errors.breedGuess)}
            >
              <TextFieldInput placeholder="말티즈 계열" />
            </TextField>
            <BreedSuggest
              value={breedGuess}
              animalType={animalType}
              onPick={(kindNm) => {
                setBreedGuess(kindNm);
                ai.touch("breedGuess");
              }}
            />

            <TextField
              label="동물등록번호"
              name="registrationNumber"
              size="medium"
              description={`동물병원이나 등록증에 적힌 숫자 ${PET_REGISTRATION_DIGITS}자리`}
              value={registrationNumber}
              onValueChange={(next) => setRegistrationNumber(next.slicedValue)}
              errorMessage={errors.registrationNumber}
              invalid={Boolean(errors.registrationNumber)}
            >
              {/* 숫자만 쓰는 칸이라 숫자 자판이 먼저 뜨게 함 */}
              <TextFieldInput
                placeholder="410123456789012"
                inputMode="numeric"
                autoComplete="off"
              />
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
