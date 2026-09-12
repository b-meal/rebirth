"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { AppHeader } from "@/components/ui/app-header";
import { PhotoField } from "@/components/ui/photo-field";
import { Screen, SectionCard } from "@/components/ui/screen";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import { addPet, type ActionState } from "@/app/mine/actions";

// 우리 동물 등록. 실종 신고를 빠르게 채우려고 미리 적어 두는 기록

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

  const upload = usePhotoUpload();
  const picker = usePhotoPicker({
    maxCount: 1,
    onChange: (photos) => {
      const next = photos[0];
      if (next) void upload.upload(next.file);
    },
  });

  // 저장이 끝나면 마이페이지로 돌려보내 방금 넣은 기록을 바로 보게 함
  useEffect(() => {
    if (state.ok) router.push("/mine");
  }, [state.ok, router]);

  return (
    <Screen bg="bg.layerBasement">
      <AppHeader title="우리 동물 등록" />

      <VStack align="stretch" gap="x2" pb="x10">
        <SectionCard gap="x5">
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            미리 등록해 두면 실종 신고를 빠르게 쓸 수 있어요
          </Text>

          {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
          <form action={action}>
            <VStack align="stretch" gap="x5">
              <PhotoField
                picker={picker}
                label="사진"
                hint="찾을 때 알아볼 수 있는 사진"
                cameraAvailable={false}
                disabled={upload.status === "uploading"}
              />
              {upload.uploadId ? (
                <input type="hidden" name="uploadId" value={upload.uploadId} />
              ) : null}
              {upload.message ? <Callout tone="critical" description={upload.message} /> : null}

              <TextField label="이름" name="name" size="medium" maxGraphemeCount={20}>
                <TextFieldInput placeholder="보리" />
              </TextField>

              <VStack align="stretch" gap="x2">
                <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                  동물 종류
                </Text>
                <SegmentedControl name="animalType" defaultValue="dog" aria-label="동물 종류">
                  {ANIMAL_OPTIONS.map((option) => (
                    <SegmentedControlItem key={option.value} value={option.value}>
                      {option.label}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </VStack>

              <VStack align="stretch" gap="x2">
                <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                  크기
                </Text>
                <SegmentedControl name="size" defaultValue="small" aria-label="크기">
                  {SIZE_OPTIONS.map((option) => (
                    <SegmentedControlItem key={option.value} value={option.value}>
                      {option.label}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </VStack>

              <VStack align="stretch" gap="x2">
                <Text as="h2" textStyle="t4Bold" color="fg.neutral">
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
              </VStack>

              <TextField
                label="품종 추정"
                name="breedGuess"
                size="medium"
                description="확정이 아니라 계열 추정으로만 보여요"
                maxGraphemeCount={30}
              >
                <TextFieldInput placeholder="말티즈" />
              </TextField>

              <TextField
                label="찾을 때 쓸 메모"
                name="note"
                size="medium"
                maxGraphemeCount={100}
              >
                <TextFieldInput placeholder="빨간 목줄, 사람을 잘 따름" />
              </TextField>

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
            </VStack>
          </form>
        </SectionCard>
      </VStack>
    </Screen>
  );
}
