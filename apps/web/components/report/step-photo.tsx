"use client";

import type { CareSituation } from "@rebirth/types";
import { useRef } from "react";
import { Button, Flex, Heading, Image, Spinner, Text } from "@chakra-ui/react";

import type { PhotoItem } from "@/lib/image";
import { Chip } from "@/components/ui/chip";
import { SectionMessage } from "@/components/ui/section-message";
import {
  PhotoPickerInput,
  type PhotoPickerInputHandle,
} from "@/components/ui/photo-picker-input";

// 1단계 사진과 보호 상황. 보호 상황이 이후 안내를 갈라 여기서 받음

// 실종 신고에만 쓰는 unknown 은 제보 폼에 내놓지 않음
const CARE_OPTIONS: { value: Exclude<CareSituation, "unknown">; label: string }[] = [
  { value: "roaming", label: "배회 중" },
  { value: "in_care", label: "내가 데리고 있음" },
];

export type StepPhotoProps = {
  photo: PhotoItem | null;
  careSituation: CareSituation | null;
  processing: boolean;
  error: string | null;
  // 데스크톱 프레임에서는 촬영 버튼을 렌더하지 않고 앨범만 노출
  cameraAvailable: boolean;
  onFiles: (files: File[]) => void;
  onCareSituation: (value: CareSituation) => void;
  onClearError: () => void;
};

export function StepPhoto({
  photo,
  careSituation,
  processing,
  error,
  cameraAvailable,
  onFiles,
  onCareSituation,
  onClearError,
}: StepPhotoProps) {
  const camera = useRef<PhotoPickerInputHandle>(null);
  const library = useRef<PhotoPickerInputHandle>(null);

  return (
    <Flex direction="column" gap="4">
      <Heading size="lg">사진을 올려 주십시오</Heading>

      {error ? (
        <SectionMessage variant="negative" onClose={onClearError}>
          {error}
        </SectionMessage>
      ) : null}

      {photo ? (
        <Flex direction="column" gap="2">
          {/* next/image 는 blob: URL 을 최적화하지 못해 img 를 그대로 씀 */}
          <Image
            src={photo.previewUrl}
            alt="선택한 사진"
            width="100%"
            aspectRatio="4 / 3"
            objectFit="cover"
            borderRadius="card"
            display="block"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={processing}
            onClick={() => (cameraAvailable ? camera : library).current?.open()}
          >
            다시 고르기
          </Button>
        </Flex>
      ) : (
        <Flex
          direction="column"
          gap="3"
          align="center"
          justify="center"
          aspectRatio="4 / 3"
          borderRadius="card"
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="border"
        >
          {processing ? (
            <>
              <Spinner />
              <Text textStyle="sm" color="fg.alternative">
                사진을 준비하고 있습니다
              </Text>
            </>
          ) : (
            <>
              <Text color="fg.alternative">발견한 동물의 사진 한 장</Text>
              <Flex gap="2">
                {cameraAvailable ? (
                  <Button colorPalette="brand" onClick={() => camera.current?.open()}>
                    사진 찍기
                  </Button>
                ) : null}
                <Button
                  variant={cameraAvailable ? "outline" : "solid"}
                  colorPalette={cameraAvailable ? "gray" : "brand"}
                  onClick={() => library.current?.open()}
                >
                  앨범에서 고르기
                </Button>
              </Flex>
            </>
          )}
        </Flex>
      )}

      <Flex direction="column" gap="2">
        <Heading size="sm">지금 어떤 상황입니까</Heading>
        <Flex gap="2" wrap="wrap">
          {CARE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={careSituation === option.value}
              onClick={() => onCareSituation(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </Flex>
        {careSituation === null ? (
          <Text textStyle="sm" color="fg.alternative">
            둘 중 하나를 골라야 다음으로 넘어갑니다
          </Text>
        ) : null}
      </Flex>

      {cameraAvailable ? (
        <PhotoPickerInput ref={camera} mode="camera" onFiles={onFiles} />
      ) : null}
      <PhotoPickerInput ref={library} mode="library" onFiles={onFiles} />
    </Flex>
  );
}
