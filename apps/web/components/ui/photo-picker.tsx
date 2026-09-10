"use client";

import { useRef, useState } from "react";
import { Box, Button, Flex, IconButton, Image, Text } from "@chakra-ui/react";

import type { PhotoItem } from "@/lib/image";
import type { PhotoPickerState } from "@/hooks/use-photo-picker";
import { IconCamera, IconClose, IconImage } from "./icons";
import { SectionMessage } from "./section-message";
import { PhotoPickerInput, type PhotoPickerInputHandle } from "./photo-picker-input";

export type PhotoPickerProps = {
  picker: PhotoPickerState;
  label?: string;
  hint?: string;
  disabled?: boolean;
  // 데스크톱처럼 카메라가 없는 환경에서는 촬영 버튼을 감춤
  cameraAvailable?: boolean;
  // 여러 장 모드의 썸네일 열 수. 한 장 모드에서는 무시
  columns?: number;
};

type Source = "camera" | "library";

const THUMBNAIL_GAP = 8;

export function PhotoPicker({
  picker,
  label = "사진",
  hint = "사진을 촬영하거나 앨범에서 선택하세요",
  disabled = false,
  cameraAvailable = true,
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

  // 원본 비율이 달라도 지정한 비율을 지키도록 cover 로 채움
  const renderThumbnail = (
    photo: PhotoItem,
    index: number,
    options: { width: string; ratio: string; alt: string },
  ) => (
    <Box
      key={photo.id}
      position="relative"
      width={options.width}
      borderRadius="card"
      borderWidth="1px"
      borderColor="border"
      overflow="hidden"
    >
      <Image
        src={photo.previewUrl}
        alt={options.alt}
        width="100%"
        aspectRatio={options.ratio}
        objectFit="cover"
        display="block"
      />
      <IconButton
        aria-label={single ? "사진 삭제" : `사진 ${index + 1} 삭제`}
        size="xs"
        variant="solid"
        colorPalette="gray"
        position="absolute"
        top="2"
        right="2"
        borderRadius="full"
        disabled={disabled || processing}
        onClick={() => removePhoto(photo.id)}
      >
        <IconClose />
      </IconButton>
    </Box>
  );

  return (
    <Flex direction="column" gap="3">
      <Flex justify="space-between" align="baseline">
        <Text textStyle="heading">{label}</Text>
        {!single && (
          <Text textStyle="bodySm" color="fg.alternative">
            {photos.length} / {maxCount}장
          </Text>
        )}
      </Flex>

      {!hasPhoto && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="2"
          padding="7"
          borderRadius="card"
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="border"
          backgroundColor="bg.alternative"
          color="fg.assistive"
        >
          <IconCamera size={28} />
          <Text color="fg.alternative" textAlign="center">
            {hint}
          </Text>
        </Flex>
      )}

      {hasPhoto &&
        single &&
        renderThumbnail(photos[0], 0, {
          width: "100%",
          ratio: "4 / 3",
          alt: "선택한 사진",
        })}

      {hasPhoto && !single && (
        <Flex wrap="wrap" gap={`${THUMBNAIL_GAP}px`}>
          {photos.map((photo, index) =>
            renderThumbnail(photo, index, {
              width: thumbnailWidth,
              ratio: "1 / 1",
              alt: `선택한 사진 ${index + 1}`,
            }),
          )}
        </Flex>
      )}

      <Flex gap="2">
        {cameraAvailable && (
          <Button
            variant="outline"
            flex="1"
            disabled={locked}
            loading={processing && activeSource === "camera"}
            onClick={() => cameraRef.current?.open()}
          >
            <IconCamera />
            {replacing ? "다시 촬영" : "사진 촬영"}
          </Button>
        )}
        <Button
          variant="outline"
          flex="1"
          disabled={locked}
          loading={processing && activeSource === "library"}
          onClick={() => libraryRef.current?.open()}
        >
          <IconImage />
          {replacing ? "다른 사진 선택" : "앨범에서 선택"}
        </Button>
      </Flex>

      {isFull && !single && !error && (
        <Text textStyle="bodySm" color="fg.alternative">
          사진은 최대 {maxCount}장까지 올릴 수 있습니다
        </Text>
      )}

      {error && (
        <SectionMessage variant="negative" onClose={dismissError}>
          {error}
        </SectionMessage>
      )}

      {cameraAvailable && (
        <PhotoPickerInput
          ref={cameraRef}
          mode="camera"
          disabled={locked}
          onFiles={handleFiles("camera")}
        />
      )}
      <PhotoPickerInput
        ref={libraryRef}
        mode="library"
        multiple={!single && remaining > 1}
        disabled={locked}
        onFiles={handleFiles("library")}
      />
    </Flex>
  );
}
