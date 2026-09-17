"use client";

import { useRef } from "react";
import {
  Box,
  Grid,
  HStack,
  Icon,
  ImageFrame,
  ImageFrameFloater,
  Text,
  VStack,
} from "@seed-design/react";
import {
  IconCameraFill,
  IconExclamationmarkTriangleFill,
  IconPictureFill,
  IconXmarkFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout, DismissibleCallout } from "seed-design/ui/callout";

import type { PhotoPickerState } from "@/hooks/use-photo-picker";
import type { PhotoPrecheckState } from "@/hooks/use-photo-precheck";
import { PhotoPickerInput, type PhotoPickerInputHandle } from "@/components/ui/photo-picker-input";
import { ScreenBody, Section } from "@/components/ui/screen";
import { ReportPhotoHero } from "./report-photo-hero";

// 1단계. 찍기 전에는 촬영 버튼 하나만 크게 두고, 찍은 뒤에는 사진을 전면으로 보임
// 찍기 전 화면의 할 일이 카메라를 여는 것뿐이라 그 버튼이 화면을 지배함

// 레퍼런스가 오면 이 문안 자리에 예시 이미지를 붙임
const TIPS = ["얼굴이 보이게", "몸 전체가 들어오면 더 좋아요", "다가가지 말고 그 자리에서"];

// 선검사가 동물을 못 찾았을 때. 막지 않고 알리기만 해 오판이 제보를 끊지 않게 함
const NOT_ANIMAL_ONE = "이 사진에서 동물이 보이지 않아요. 다시 고르거나 그대로 진행할 수 있어요";
const notAnimalMany = (count: number) =>
  `사진 ${count}장에서 동물이 보이지 않아요. 다시 고르거나 그대로 진행할 수 있어요`;

export type ReportCaptureProps = {
  picker: PhotoPickerState;
  /** 고른 사진에 동물이 보이는지 1단계에서 미리 물어본 결과 */
  precheck: PhotoPrecheckState;
  /** 장치 조회가 끝나기 전에는 null. 모바일이 기본이라 그동안 촬영으로 둠 */
  cameraAvailable: boolean | null;
  step: number;
  total: number;
  label: string;
  onNext: () => void;
};

export function ReportCapture({
  picker,
  precheck,
  cameraAvailable,
  step,
  total,
  label,
  onNext,
}: ReportCaptureProps) {
  const cameraRef = useRef<PhotoPickerInputHandle>(null);
  // PC 는 촬영이 안 되는 자리라 앨범 입력으로 대신 엶
  const libraryRef = useRef<PhotoPickerInputHandle>(null);
  // 조회가 끝나기 전에는 촬영으로 둠. 폰이 기본이라 그동안 글이 덜 바뀜
  const camera = cameraAvailable !== false;
  const { photos, maxCount, isFull, processing, error, addFiles, dismissError } = picker;

  // capture 는 명세상 힌트라 카메라가 없는 기기는 알아서 파일 선택기로 떨어짐
  // 장치 조회로 가리면 권한 전에 videoinput 을 안 내놓는 브라우저에서 카메라가 안 열림
  const hidden = (
    <>
      <PhotoPickerInput
        ref={cameraRef}
        mode="camera"
        disabled={processing || isFull}
        onFiles={addFiles}
      />
      <PhotoPickerInput
        ref={libraryRef}
        mode="library"
        multiple={maxCount > 1}
        disabled={processing || isFull}
        onFiles={addFiles}
      />
    </>
  );

  // 폰은 촬영만, PC 는 앨범만
  // 현장에서 찍은 사진이라야 방금 그 자리의 동물임이 믿어지고, 갈 곳이 둘이면 고르는 걸음이 늘어남
  const openPicker = () => (camera ? cameraRef : libraryRef).current?.open();

  if (photos.length === 0) {
    return (
      <>
        <ScreenBody gap="x8">
          <VStack align="stretch" gap="x2">
            <Box height="x1" borderRadius="full" bg="bg.neutralWeak" overflowX="hidden">
              <Box
                height="x1"
                borderRadius="full"
                bg="bg.brandSolid"
                width={`${(step / total) * 100}%`}
              />
            </Box>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {step} / {total}, {label}
            </Text>
          </VStack>

          <Section gap="x2_5" mt="x5">
            <Text as="h2" textStyle="t8Bold" color="fg.neutral">
              발견한 동물을 찍어 주세요
            </Text>
            <Text textStyle="t5Regular" color="fg.neutralMuted">
              사진 한 장이면 나머지는 AI 가 채워요
            </Text>
          </Section>

          <VStack align="stretch" gap="x3_5">
            {TIPS.map((tip, index) => (
              <HStack key={tip} gap="x2_5" align="flex-start">
                <VStack
                  align="center"
                  justify="center"
                  width="x5_5"
                  height="x5_5"
                  borderRadius="full"
                  bg="bg.neutralWeak"
                >
                  <Text textStyle="t2Bold" color="fg.neutralSubtle">
                    {index + 1}
                  </Text>
                </VStack>
                <Text textStyle="t5Regular" color="fg.neutralMuted">
                  {tip}
                </Text>
              </HStack>
            ))}
          </VStack>

          {error ? (
            <DismissibleCallout tone="critical" description={error} onDismiss={dismissError} />
          ) : null}
        </ScreenBody>

        <VStack align="stretch" gap="x2" px="spacingX.globalGutter" pt="x4" pb="x5">
          <ActionButton
            variant="brandSolid"
            size="large"
            loading={processing}
            onClick={openPicker}
          >
            <Icon svg={camera ? <IconCameraFill /> : <IconPictureFill />} />
            {camera ? "사진 촬영" : "앨범에서 선택"}
          </ActionButton>
          <Text textStyle="t3Regular" color="fg.neutralSubtle" align="center">
            최대 {maxCount}장까지 {camera ? "찍을" : "고를"} 수 있어요
          </Text>
        </VStack>
        {hidden}
      </>
    );
  }

  return (
    <>
      <ReportPhotoHero photos={photos} step={step} total={total} label={label} />

      <ScreenBody gap="x5" pt="x5">
        <Section gap="x1_5">
          <Text as="h2" textStyle="t7Bold" color="fg.neutral">
            이 사진으로 할까요
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            {isFull
              ? `사진 ${photos.length}장을 함께 분석해요`
              : "한 장 더 있으면 AI 가 더 정확해져요"}
          </Text>
        </Section>

        <Grid columns={3} gap="x2">
          {photos.map((photo, index) => {
            const flagged = precheck.verdictOf(photo.id) === "not-animal";
            return (
              // 한 장만 빼는 일이 잦아 사진마다 지우는 자리를 둠. 전체 비우기는 아래 버튼이 함
              <ImageFrame
                key={photo.id}
                src={photo.previewUrl}
                alt={index === 0 ? "대표 사진" : `사진 ${index + 1}`}
                ratio={1}
                width="full"
                borderRadius="r3"
                stroke
              >
                <ImageFrameFloater placement="top-end" offsetX="x2" offsetY="x2">
                  <ActionButton
                    type="button"
                    variant="neutralSolid"
                    size="xsmall"
                    layout="iconOnly"
                    aria-label={`사진 ${index + 1} 삭제`}
                    onClick={() => picker.removePhoto(photo.id)}
                  >
                    <Icon svg={<IconXmarkFill />} />
                  </ActionButton>
                </ImageFrameFloater>

                {/* 어느 사진이 걸렸는지 칸 위에서 바로 보이게 함. 아래 문구가 무엇을 하라는지 말함 */}
                {flagged ? (
                  <ImageFrameFloater placement="bottom-start" offsetX="x1_5" offsetY="x1_5">
                    <VStack
                      align="center"
                      justify="center"
                      width="x6"
                      height="x6"
                      borderRadius="full"
                      bg="bg.warningSolid"
                      role="img"
                      aria-label={`사진 ${index + 1} 에서 동물이 보이지 않음`}
                    >
                      <Icon
                        svg={<IconExclamationmarkTriangleFill />}
                        size="x3_5"
                        color="fg.warningContrast"
                      />
                    </VStack>
                  </ImageFrameFloater>
                ) : null}
              </ImageFrame>
            );
          })}
          {isFull ? null : (
            <VStack
              asChild
              align="center"
              justify="center"
              borderRadius="r3"
              bg="bg.layerFloating"
              borderWidth="1px"
              borderColor="stroke.neutralMuted"
            >
              <button
                type="button"
                onClick={openPicker}
                aria-label={camera ? "사진 더 찍기" : "사진 더 고르기"}
              >
                <Icon
                  svg={camera ? <IconCameraFill /> : <IconPictureFill />}
                  size="x6"
                  color="fg.brand"
                />
              </button>
            </VStack>
          )}
        </Grid>

        {precheck.flagged.length > 0 ? (
          <Callout
            tone="warning"
            prefixIcon={<IconExclamationmarkTriangleFill />}
            description={
              precheck.flagged.length === 1
                ? NOT_ANIMAL_ONE
                : notAnimalMany(precheck.flagged.length)
            }
          />
        ) : null}

        {error ? (
          <DismissibleCallout tone="critical" description={error} onDismiss={dismissError} />
        ) : null}
      </ScreenBody>

      <HStack
        gap="x2"
        px="spacingX.globalGutter"
        pt="x3"
        pb="x5"
        bg="bg.layerDefault"
        borderTopWidth="1px"
        borderColor="stroke.neutralMuted"
      >
        <ActionButton variant="neutralOutline" size="large" onClick={picker.clear}>
          다시 찍기
        </ActionButton>
        <ActionButton
          variant="brandSolid"
          size="large"
          flexGrow={1}
          disabled={processing}
          onClick={onNext}
        >
          다음
        </ActionButton>
      </HStack>
      {hidden}
    </>
  );
}
