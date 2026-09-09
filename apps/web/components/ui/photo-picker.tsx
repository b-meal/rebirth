"use client";

import { useRef, useState } from "react";
import {
  Button,
  FlexBox,
  IconButton,
  SectionMessage,
  Thumbnail,
  Typography,
} from "@wanteddev/wds";
import { IconCamera, IconClose, IconImage } from "@wanteddev/wds-icon";
import type { PhotoItem } from "../../lib/image";
import type { PhotoPickerState } from "../../hooks/use-photo-picker";
import { PhotoPickerInput, type PhotoPickerInputHandle } from "./photo-picker-input";

export type PhotoPickerProps = {
  picker: PhotoPickerState;
  label?: string;
  hint?: string;
  disabled?: boolean;
  // 여러 장 모드의 썸네일 열 수. 한 장 모드에서는 무시
  columns?: number;
};

type Source = "camera" | "library";

const THUMBNAIL_GAP = 8;

// 원본 비율이 달라도 Thumbnail 의 ratio 를 지키도록 이미지를 절대 배치해 cover 로 채움
const coverImageSx = { "& > img": { position: "absolute", inset: 0 } } as const;

export function PhotoPicker({
  picker,
  label = "사진",
  hint = "사진을 촬영하거나 앨범에서 선택하세요",
  disabled = false,
  columns = 3,
}: PhotoPickerProps) {
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

  // 한 장 모드는 크게 한 장만 보여주고, 가득 차도 새 선택으로 교체
  const single = maxCount === 1;
  const hasPhoto = photos.length > 0;
  const replacing = single && hasPhoto;
  const locked = disabled || processing || (isFull && !single);
  const thumbnailWidth = `calc((100% - ${THUMBNAIL_GAP * (columns - 1)}px) / ${columns})`;

  const handleFiles = (source: Source) => async (files: File[]) => {
    setActiveSource(source);
    try {
      await (replacing ? replaceFiles(files) : addFiles(files));
    } finally {
      setActiveSource(null);
    }
  };

  const renderRemoveButton = (photo: PhotoItem, index: number) => (
    // Thumbnail 의 테두리 오버레이 위로 올려 클릭 가능하게 유지
    <FlexBox sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
      <IconButton
        variant="background"
        alternative
        size={22}
        aria-label={single ? "사진 삭제" : `사진 ${index + 1} 삭제`}
        disabled={disabled || processing}
        onClick={() => removePhoto(photo.id)}
      >
        <IconClose />
      </IconButton>
    </FlexBox>
  );

  return (
    <FlexBox flexDirection="column" gap="12px">
      <FlexBox justifyContent="space-between" alignItems="baseline">
        <Typography variant="label1" weight="bold" color="semantic.label.normal">
          {label}
        </Typography>
        {!single && (
          <Typography variant="caption1" color="semantic.label.alternative">
            {photos.length} / {maxCount}장
          </Typography>
        )}
      </FlexBox>

      {!hasPhoto && (
        <FlexBox
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap="8px"
          sx={(theme) => ({
            padding: "28px 16px",
            borderRadius: 12,
            border: `1px dashed ${theme.semantic.line.normal.normal}`,
            backgroundColor: theme.semantic.background.normal.alternative,
            color: theme.semantic.label.assistive,
          })}
        >
          <IconCamera width={28} height={28} aria-hidden="true" />
          <Typography variant="body2" color="semantic.label.alternative" align="center">
            {hint}
          </Typography>
        </FlexBox>
      )}

      {hasPhoto && single && (
        <Thumbnail
          src={photos[0].previewUrl}
          alt="선택한 사진"
          ratio="4:3"
          radius
          border
          width="100%"
          sx={coverImageSx}
        >
          {renderRemoveButton(photos[0], 0)}
        </Thumbnail>
      )}

      {hasPhoto && !single && (
        <FlexBox flexWrap="wrap" gap={`${THUMBNAIL_GAP}px`}>
          {photos.map((photo, index) => (
            <Thumbnail
              key={photo.id}
              src={photo.previewUrl}
              alt={`선택한 사진 ${index + 1}`}
              ratio="1:1"
              radius
              border
              width={thumbnailWidth}
              sx={coverImageSx}
            >
              {renderRemoveButton(photo, index)}
            </Thumbnail>
          ))}
        </FlexBox>
      )}

      <FlexBox gap="8px">
        <Button
          variant="outlined"
          color="assistive"
          fullWidth
          leadingContent={<IconCamera />}
          disabled={locked}
          loading={processing && activeSource === "camera"}
          onClick={() => cameraRef.current?.open()}
        >
          {replacing ? "다시 촬영" : "사진 촬영"}
        </Button>
        <Button
          variant="outlined"
          color="assistive"
          fullWidth
          leadingContent={<IconImage />}
          disabled={locked}
          loading={processing && activeSource === "library"}
          onClick={() => libraryRef.current?.open()}
        >
          {replacing ? "다른 사진 선택" : "앨범에서 선택"}
        </Button>
      </FlexBox>

      {isFull && !single && !error && (
        <Typography variant="caption1" color="semantic.label.alternative">
          사진은 최대 {maxCount}장까지 올릴 수 있습니다
        </Typography>
      )}

      {error && (
        <SectionMessage
          variant="negative"
          closeButton
          open
          onOpenChange={(open) => {
            if (!open) dismissError();
          }}
        >
          {error}
        </SectionMessage>
      )}

      <PhotoPickerInput
        ref={cameraRef}
        mode="camera"
        disabled={locked}
        onFiles={handleFiles("camera")}
      />
      <PhotoPickerInput
        ref={libraryRef}
        mode="library"
        multiple={!single && remaining > 1}
        disabled={locked}
        onFiles={handleFiles("library")}
      />
    </FlexBox>
  );
}
