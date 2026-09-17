"use client";

import { useEffect, useRef, useState } from "react";
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
import { IconCameraFill, IconPictureFill, IconXmarkFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { DismissibleCallout } from "seed-design/ui/callout";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import type { PhotoItem } from "@/lib/image";
import type { PhotoPickerState } from "@/hooks/use-photo-picker";
import type { PhotoPrecheckState, PhotoVerdict } from "@/hooks/use-photo-precheck";
import { PhotoPickerInput, type PhotoPickerInputHandle } from "@/components/ui/photo-picker-input";
import { ScreenBody, Section } from "@/components/ui/screen";
import { ReportPhotoHero } from "./report-photo-hero";

// 1단계. 찍기 전에는 촬영 버튼 하나만 크게 두고, 찍은 뒤에는 사진을 전면으로 보임
// 찍기 전 화면의 할 일이 카메라를 여는 것뿐이라 그 버튼이 화면을 지배함

// 레퍼런스가 오면 이 문안 자리에 예시 이미지를 붙임
const TIPS = ["얼굴이 보이게", "몸 전체가 들어오면 더 좋아요", "다가가지 말고 그 자리에서"];

// 선검사가 동물을 못 찾았을 때. 칸 위의 X 와 함께 다음으로 못 넘어가는 이유를 들고 있음
const NOT_ANIMAL_HINT = "동물이 보이지 않는 사진을 지워 주세요";

// 살펴보는 중에는 덮개가 지우는 단추를 가리지 않게 손가락을 통과시킴
const SCANNING = { pointerEvents: "none" } as const;

// 이만큼 지나도 판정이 안 오면 살펴보는 중을 보임. 기기 판정은 이 전에 끝남
const CHECKING_DELAY_MS = 150;

type PhotoTileProps = {
  photo: PhotoItem;
  index: number;
  verdict: PhotoVerdict;
  onRemove: (photoId: string) => void;
};

/** 사진 한 칸. 살펴보는 동안과 걸렸을 때를 사진 위에 덮어 어느 칸인지 바로 보이게 함 */
function PhotoTile({ photo, index, verdict, onRemove }: PhotoTileProps) {
  const rejected = verdict === "not-animal";

  // 기기 판정은 15ms 에 끝나 곧바로 그리면 덮개가 한 프레임만 번쩍임
  // 서버로 갈 때는 700ms 쯤 걸려 이 늦춤 뒤에도 충분히 보임
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (verdict !== "checking") return;
    const timer = setTimeout(() => setWaited(true), CHECKING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [verdict]);
  const checking = verdict === "checking" && waited;

  return (
    // 한 장만 빼는 일이 잦아 사진마다 지우는 자리를 둠
    <ImageFrame
      src={photo.previewUrl}
      alt={index === 0 ? "대표 사진" : `사진 ${index + 1}`}
      ratio={1}
      width="full"
      borderRadius="r3"
      stroke
    >
      {/* 살펴보는 동안. 지우는 단추가 이 위로 와야 해 먼저 두고 손가락은 통과시킴 */}
      {checking ? (
        <VStack
          position="absolute"
          top="0"
          right="0"
          bottom="0"
          left="0"
          align="center"
          justify="center"
          bg="palette.staticBlackAlpha400"
          style={SCANNING}
          role="img"
          aria-label={`사진 ${index + 1} 살펴보는 중`}
        >
          <ProgressCircle size="24" tone="staticWhite" />
        </VStack>
      ) : null}

      {/* 걸린 칸은 이 X 하나만 둠. 오른쪽 위 지우는 단추와 겹쳐 보이지 않게 함 */}
      {/* 표시와 지우기를 한 자리에 둬 누를 곳을 찾지 않아도 되게 함 */}
      {rejected ? (
        <VStack
          asChild
          position="absolute"
          top="0"
          right="0"
          bottom="0"
          left="0"
          align="center"
          justify="center"
          bg="palette.staticBlackAlpha500"
        >
          <button
            type="button"
            aria-label={`사진 ${index + 1} 에서 동물이 보이지 않음, 눌러서 지우기`}
            onClick={() => onRemove(photo.id)}
          >
            <VStack
              align="center"
              justify="center"
              width="x9"
              height="x9"
              borderRadius="full"
              bg="bg.criticalSolid"
            >
              <Icon svg={<IconXmarkFill />} size="x6" color="fg.criticalContrast" />
            </VStack>
          </button>
        </VStack>
      ) : null}

      {rejected ? null : (
        <ImageFrameFloater placement="top-end" offsetX="x2" offsetY="x2">
          <ActionButton
            type="button"
            variant="neutralSolid"
            size="xsmall"
            layout="iconOnly"
            aria-label={`사진 ${index + 1} 삭제`}
            onClick={() => onRemove(photo.id)}
          >
            <Icon svg={<IconXmarkFill />} />
          </ActionButton>
        </ImageFrameFloater>
      )}
    </ImageFrame>
  );
}

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

  const { flagged } = precheck;
  const { removePhoto } = picker;

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
          <Text
            textStyle="t4Regular"
            color={flagged.length > 0 ? "fg.critical" : "fg.neutralMuted"}
          >
            {flagged.length > 0
              ? NOT_ANIMAL_HINT
              : isFull
                ? `사진 ${photos.length}장을 함께 분석해요`
                : "한 장 더 있으면 AI 가 더 정확해져요"}
          </Text>
        </Section>

        <Grid columns={3} gap="x2">
          {photos.map((photo, index) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              index={index}
              verdict={precheck.verdictOf(photo.id)}
              onRemove={removePhoto}
            />
          ))}
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

        {error ? (
          <DismissibleCallout tone="critical" description={error} onDismiss={dismissError} />
        ) : null}
      </ScreenBody>

      {/* 실종신고와 같이 화면 아래에 붙여 둠. 아래 여백은 기기 안전 영역까지 함께 들어감 */}
      <VStack
        align="stretch"
        position="sticky"
        bottom="0"
        px="spacingX.globalGutter"
        pt="x3"
        bg="bg.layerDefault"
        borderTopWidth="1px"
        borderColor="stroke.neutralMuted"
        className="rebirth-bottom-bar"
      >
        {/* 동물이 안 보이는 사진을 안고 2단계로 가면 거기서 되돌려 보내 걸음만 늘어남 */}
        <ActionButton
          variant="brandSolid"
          size="large"
          disabled={processing || flagged.length > 0}
          onClick={onNext}
        >
          다음
        </ActionButton>
      </VStack>
      {hidden}
    </>
  );
}
