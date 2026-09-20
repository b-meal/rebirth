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
import {
  IconPictureFill,
  IconPlusLine,
  IconXmarkFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { DismissibleCallout } from "seed-design/ui/callout";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import type { PhotoItem } from "@/lib/image";
import type { PhotoPickerState } from "@/hooks/use-photo-picker";
import { PhotoPickerInput, type PhotoPickerInputHandle } from "./photo-picker-input";

// 촬영과 앨범 선택을 한 자리에서 다루는 사진 입력, 미리보기는 SEED ImageFrame
//
// 누르는 자리는 언제나 하나뿐이고 갈 곳을 묻지 않음
// 웹에서 고르는 창은 파일 입력 그 자체라, 그 앞에 우리 시트를 세우면 물음이 두 번 나옴
// 자세한 까닭은 photo-picker-input 에 적어 둠

export type PhotoFieldProps = {
  picker: PhotoPickerState;
  label?: string;
  hint?: string;
  disabled?: boolean;
  /** 서버로 올리는 중인지. 고른 사진 위에 표시를 덮어 그 자리에서 보여 줌 */
  uploading?: boolean;
};

const SINGLE_RATIO = 4 / 3;

export function PhotoField({
  picker,
  label = "사진",
  hint = "사진을 촬영하거나 앨범에서 골라 주세요",
  uploading = false,
  disabled = false,
}: PhotoFieldProps) {
  const libraryRef = useRef<PhotoPickerInputHandle>(null);
  // 이 칸이 시작한 처리인지. 같은 picker 를 다른 곳이 함께 쓰면 processing 만으로는 가려지지 않음
  const [ingesting, setIngesting] = useState(false);

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

  // 확인이 끝나 카메라가 없다고 밝혀졌을 때만 촬영을 접음
  // capture 는 명세상 힌트라 카메라가 없는 기기는 알아서 파일 선택기로 떨어지고
  // 권한 전에는 videoinput 을 안 내놓는 브라우저가 있어 확인 중에는 열어 둠
  const requestPhoto = () => libraryRef.current?.open();

  const handleFiles = async (files: File[]) => {
    setIngesting(true);
    try {
      await (replacing ? replaceFiles(files) : addFiles(files));
    } finally {
      setIngesting(false);
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
        {/* 폼 안에서는 type 이 없으면 submit 이 되어 누르는 순간 저장이 돌아감 */}
        <ActionButton
          type="button"
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

  // 여러 장 모드에서 사진 뒤에 붙는 더 담기 칸
  // 목록 끝에 두면 다음 자리가 어디인지 눈이 이미 아는 곳에 손이 감
  const addTile = (
    <VStack
      asChild
      align="center"
      justify="center"
      gap="x1"
      borderRadius="r3"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.neutralWeak"
    >
      {/* design-system-allow:raw-element 넓은 면 전체를 누르는 자리라 button 이 필요함 */}
      <button
        type="button"
        className="rebirth-photo-zone rebirth-photo-tile"
        disabled={locked}
        aria-label={`사진 더 담기, ${photos.length}/${maxCount}장`}
        onClick={requestPhoto}
      >
        <Icon svg={<IconPlusLine />} size="x6" color="fg.neutralSubtle" />
        <Text textStyle="t2Regular" color="fg.neutralMuted">
          {photos.length}/{maxCount}
        </Text>
      </button>
    </VStack>
  );

  return (
    <VStack align="stretch" gap="x3">
      <HStack justify="space-between" align="center">
        <Text textStyle="t5Bold" color="fg.neutral">
          {label}
        </Text>
        {single || !hasPhoto ? null : (
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {photos.length} / {maxCount}장
          </Text>
        )}
      </HStack>

      {/* 비어 있을 때는 그 자리가 곧 누르는 자리
          큰 그림을 보여 주고 정작 동작은 아래 작은 버튼에 두면 손이 한 번 더 움직임 */}
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
            onClick={requestPhoto}
          >
            {/* 사진 아이콘은 촬영이든 앨범이든 맞는 그림이라 확인이 끝나도 바뀌지 않음
                카메라 아이콘을 먼저 보였다가 되돌리면 손이 가던 곳이 달라짐 */}
            <Icon svg={<IconPictureFill />} size="x8" color="fg.neutralSubtle" />
            <Text textStyle="t4Regular" color="fg.neutralMuted" align="center">
              {hint}
            </Text>
          </button>
        </VStack>
      )}

      {hasPhoto && single ? (
        <>
          {thumbnail(photos[0], 0, SINGLE_RATIO, "full")}
          {/* 한 장 모드는 갈아 끼우는 것이 유일한 다음 동작이라 그것만 내놓음 */}
          <ActionButton
            type="button"
            variant="neutralWeak"
            size="medium"
            disabled={locked}
            loading={processing && ingesting}
            onClick={requestPhoto}
          >
            다른 사진으로 바꾸기
          </ActionButton>
        </>
      ) : null}

      {hasPhoto && !single ? (
        <Grid columns={3} gap="x2">
          {photos.map((photo, index) => thumbnail(photo, index, 1, "full"))}
          {isFull ? null : addTile}
        </Grid>
      ) : null}

      {isFull && !single && !error ? (
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          사진은 최대 {maxCount}장까지 올릴 수 있어요
        </Text>
      ) : null}

      {error ? (
        <DismissibleCallout tone="critical" description={error} onDismiss={dismissError} />
      ) : null}

      <PhotoPickerInput
        ref={libraryRef}
        mode="library"
        multiple={!single && remaining > 1}
        disabled={locked}
        onFiles={handleFiles}
      />
    </VStack>
  );
}
