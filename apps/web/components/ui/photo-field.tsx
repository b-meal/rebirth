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
  IconCameraFill,
  IconPictureFill,
  IconPlusLine,
  IconXmarkFill,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { DismissibleCallout } from "seed-design/ui/callout";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { List, ListButtonItem } from "seed-design/ui/list";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import type { PhotoItem } from "@/lib/image";
import type { PhotoPickerState } from "@/hooks/use-photo-picker";
import { PhotoPickerInput, type PhotoPickerInputHandle } from "./photo-picker-input";

// 촬영과 앨범 선택을 한 자리에서 다루는 사진 입력, 미리보기는 SEED ImageFrame
//
// 누르는 자리는 언제나 하나뿐임
// 빈 자리와 촬영 버튼과 앨범 버튼을 나란히 두면 셋이 같은 일을 해 어디를 눌러야 할지 고르게 됨
// 갈 곳이 둘이면 누른 뒤에 시트로 묻고, 하나뿐이면 묻지 않고 바로 엶

export type PhotoFieldProps = {
  picker: PhotoPickerState;
  label?: string;
  hint?: string;
  disabled?: boolean;
  /** 서버로 올리는 중인지. 고른 사진 위에 표시를 덮어 그 자리에서 보여 줌 */
  uploading?: boolean;
  /**
   * 데스크톱처럼 카메라가 없는 환경에서는 촬영을 내놓지 않음
   * 아직 장치를 확인하는 중이면 null. 이때는 갈 곳을 단정하는 문구를 쓰지 않음
   * false 로 접어 버리면 확인이 끝나는 순간 글이 바뀌어 읽던 문장이 눈앞에서 달라짐
   */
  cameraAvailable?: boolean | null;
  /** 현장 촬영만 받는 화면에서는 앨범을 내놓지 않음 */
  libraryAvailable?: boolean;
};

type Source = "camera" | "library";

const SINGLE_RATIO = 4 / 3;

export function PhotoField({
  picker,
  label = "사진",
  hint = "사진을 촬영하거나 앨범에서 골라 주세요",
  uploading = false,
  disabled = false,
  cameraAvailable = true,
  libraryAvailable = true,
}: PhotoFieldProps) {
  const cameraRef = useRef<PhotoPickerInputHandle>(null);
  const libraryRef = useRef<PhotoPickerInputHandle>(null);
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  // 갈 곳이 둘일 때만 열림
  const [chooserOpen, setChooserOpen] = useState(false);

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
  const hasCamera = cameraAvailable !== false;
  const bothSources = hasCamera && libraryAvailable;

  const open = (source: Source) => {
    setChooserOpen(false);
    (source === "camera" ? cameraRef : libraryRef).current?.open();
  };

  // 갈 곳이 하나뿐이면 묻지 않음. 한 갈래뿐인 물음은 걸음만 늘림
  const requestPhoto = () => {
    if (bothSources) {
      setChooserOpen(true);
      return;
    }
    open(hasCamera ? "camera" : "library");
  };

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
            loading={processing && activeSource !== null}
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

      {/* 갈 곳이 둘일 때만 물음. 시트는 손이 닿는 아래쪽에서 열림 */}
      <BottomSheetRoot open={chooserOpen} onOpenChange={setChooserOpen}>
        <BottomSheetContent title="사진 가져오기">
          <BottomSheetBody>
            {/* 누를 수 있는 줄은 ListButtonItem 이라야 함
                ListItem 은 li 라 SEED 의 hover 규칙(button, a 에만 걸림)이 붙지 않음 */}
            <List>
              <ListButtonItem
                prefix={<Icon svg={<IconCameraFill />} />}
                title="사진 촬영"
                detail="카메라로 지금 찍기"
                onClick={() => open("camera")}
              />
              <ListButtonItem
                prefix={<Icon svg={<IconPictureFill />} />}
                title="앨범에서 선택"
                detail={single ? "저장된 사진 고르기" : `최대 ${remaining}장까지 고르기`}
                onClick={() => open("library")}
              />
            </List>
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheetRoot>

      {/* 확인 중에도 걸어 둠. 없으면 그 사이에 누른 촬영이 아무 일도 하지 않음 */}
      {hasCamera ? (
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
