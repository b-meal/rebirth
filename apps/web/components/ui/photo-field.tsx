"use client";

import { useRef, useState } from "react";
import {
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
import { PhotoPickerInput, type PhotoPickerInputHandle } from "./photo-picker-input";

// 촬영과 앨범 선택을 한 자리에서 다루는 사진 입력, 미리보기는 SEED ImageFrame

export type PhotoFieldProps = {
  picker: PhotoPickerState;
  label?: string;
  hint?: string;
  disabled?: boolean;
  /** 서버로 올리는 중인지. 고른 사진 위에 표시를 덮어 그 자리에서 보여 줌 */
  uploading?: boolean;
  /** 데스크톱처럼 카메라가 없는 환경에서는 촬영 버튼을 감춤 */
  cameraAvailable?: boolean;
  /** 현장 촬영만 받는 화면에서는 앨범 버튼을 감춤 */
  libraryAvailable?: boolean;
};

type Source = "camera" | "library";

const SINGLE_RATIO = 4 / 3;

export function PhotoField({
  picker,
  label = "사진",
  hint = "사진을 촬영하거나 앨범에서 선택하세요",
  uploading = false,
  disabled = false,
  cameraAvailable = true,
  libraryAvailable = true,
}: PhotoFieldProps) {
  const cameraRef = useRef<PhotoPickerInputHandle>(null);
  const libraryRef = useRef<PhotoPickerInputHandle>(null);
  const [activeSource, setActiveSource] = useState<Source | null>(null);

  const {
    photos,
    maxCount,
    remaining,
    isFull,
    processing,
    error,
    addFiles,
    replaceFiles,
    removePhoto,
    dismissError,
  } = picker;

  // 한 장 모드는 크게 한 장만 보여주고 가득 차도 새 선택으로 교체
  const single = maxCount === 1;
  const hasPhoto = photos.length > 0;
  const replacing = single && hasPhoto;
  const locked = disabled || processing || (isFull && !single);

  const handleFiles = (source: Source) => async (files: File[]) => {
    setActiveSource(source);
    try {
      await (replacing ? replaceFiles(files) : addFiles(files));
    } finally {
      setActiveSource(null);
    }
  };

  const thumbnail = (photo: PhotoItem, index: number, ratio: number, width: string) => (
    <ImageFrame
      key={photo.id}
      src={photo.previewUrl}
      alt={single ? "선택한 사진" : `선택한 사진 ${index + 1}`}
      ratio={ratio}
      width={width}
      borderRadius="r3"
      stroke
      // 사진만 어둡게 눌러 흰 표시가 밝은 사진 위에서도 읽힘
      // 프레임에 걸면 그 위에 떠 있는 표시와 삭제 단추까지 함께 어두워짐
      className={uploading ? "rebirth-photo--busy" : undefined}
    >
      {/* 올리는 중임을 사진 위에 덮어 보여 줌
          아래에 글로 적으면 눈이 사진에서 떠나야 하고 곧 사라질 한 줄이 자리를 차지함 */}
      {uploading ? (
        <ImageFrameFloater placement="middle-center">
          <ProgressCircle size="24" tone="staticWhite" />
        </ImageFrameFloater>
      ) : null}

      <ImageFrameFloater placement="top-end" offsetX="x2" offsetY="x2">
        <ActionButton
          variant="neutralSolid"
          size="xsmall"
          layout="iconOnly"
          aria-label={single ? "사진 삭제" : `사진 ${index + 1} 삭제`}
          disabled={disabled || processing}
          onClick={() => removePhoto(photo.id)}
        >
          <Icon svg={<IconXmarkFill />} />
        </ActionButton>
      </ImageFrameFloater>
    </ImageFrame>
  );

  return (
    <VStack align="stretch" gap="x3">
      <HStack justify="space-between" align="center">
        <Text textStyle="t5Bold" color="fg.neutral">
          {label}
        </Text>
        {single ? null : (
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {photos.length} / {maxCount}장
          </Text>
        )}
      </HStack>

      {/* 비어 있을 때는 그 자리가 곧 누르는 자리
          큰 그림을 보여 주고 정작 동작은 아래 작은 버튼에 두면 손이 한 번 더 움직임
          카메라가 있는 화면은 어느 쪽으로 열지 갈리므로 아래 버튼에 맡김 */}
      {hasPhoto ? null : (
        <VStack
          asChild
          align="center"
          justify="center"
          gap="x2"
          py="x10"
          borderRadius="r3"
          borderWidth={1}
          borderColor="stroke.neutralMuted"
          bg="bg.neutralWeak"
        >
          {/* design-system-allow:raw-element 넓은 면 전체를 누르는 자리라 button 이 필요함 */}
          <button
            type="button"
            className="rebirth-photo-zone"
            disabled={locked}
            onClick={() => (cameraAvailable ? cameraRef : libraryRef).current?.open()}
          >
            <Icon svg={<IconPictureFill />} size="x8" color="fg.neutralSubtle" />
            <Text textStyle="t4Regular" color="fg.neutralMuted" align="center">
              {hint}
            </Text>
          </button>
        </VStack>
      )}

      {hasPhoto && single ? thumbnail(photos[0], 0, SINGLE_RATIO, "full") : null}

      {hasPhoto && !single ? (
        <Grid columns={Math.min(maxCount, 3)} gap="x2">
          {photos.map((photo, index) => thumbnail(photo, index, 1, "full"))}
        </Grid>
      ) : null}

      {/* 빈 자리가 이미 앨범을 여는데 갈 곳이 하나뿐이면 아래 버튼은 같은 말을 되풀이함
          카메라가 있으면 어디로 열지 골라야 하므로 그대로 둠 */}
      <HStack gap="x2" display={!hasPhoto && !cameraAvailable ? "none" : "flex"}>
        {cameraAvailable ? (
          <ActionButton
            variant="neutralOutline"
            size="medium"
            flexGrow={1}
            disabled={locked}
            loading={processing && activeSource === "camera"}
            onClick={() => cameraRef.current?.open()}
          >
            <Icon svg={<IconCameraFill />} />
            {replacing ? "다시 촬영" : "사진 촬영"}
          </ActionButton>
        ) : null}
        {libraryAvailable ? (
          <ActionButton
            variant="neutralOutline"
            size="medium"
            flexGrow={1}
            disabled={locked}
            loading={processing && activeSource === "library"}
            onClick={() => libraryRef.current?.open()}
          >
            <Icon svg={<IconPictureFill />} />
            {replacing ? "다른 사진 선택" : "앨범에서 선택"}
          </ActionButton>
        ) : null}
      </HStack>

      {isFull && !single && !error ? (
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          사진은 최대 {maxCount}장까지 올릴 수 있어요
        </Text>
      ) : null}

      {error ? (
        <DismissibleCallout tone="critical" description={error} onDismiss={dismissError} />
      ) : null}

      {cameraAvailable ? (
        <PhotoPickerInput
          ref={cameraRef}
          mode="camera"
          disabled={locked}
          onFiles={handleFiles("camera")}
        />
      ) : null}
      {libraryAvailable ? (
        <PhotoPickerInput
          ref={libraryRef}
          mode="library"
          multiple={!single && remaining > 1}
          disabled={locked}
          onFiles={handleFiles("library")}
        />
      ) : null}
    </VStack>
  );
}
