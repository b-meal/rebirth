"use client";

import type { CareSituation } from "@rebirth/types";
import { useRef } from "react";
import {
  Button,
  Chip,
  FlexBox,
  Loading,
  SectionMessage,
  Typography,
} from "@wanteddev/wds";

import type { PhotoItem } from "../../lib/image";
import {
  PhotoPickerInput,
  type PhotoPickerInputHandle,
} from "../ui/photo-picker-input";

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
    <FlexBox flexDirection="column" gap="16px">
      <Typography variant="title3" weight="bold">
        사진을 올려 주십시오
      </Typography>

      {error ? (
        <SectionMessage variant="negative" open closeButton onOpenChange={onClearError}>
          {error}
        </SectionMessage>
      ) : null}

      {photo ? (
        <FlexBox flexDirection="column" gap="8px">
          {/* next/image 는 blob: URL 을 최적화하지 못해 img 를 그대로 씀 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl}
            alt="선택한 사진"
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              objectFit: "cover",
              borderRadius: "12px",
              display: "block",
            }}
          />
          <Button
            variant="outlined"
            size="small"
            disabled={processing}
            onClick={() => (cameraAvailable ? camera : library).current?.open()}
          >
            다시 고르기
          </Button>
        </FlexBox>
      ) : (
        <FlexBox
          flexDirection="column"
          gap="12px"
          alignItems="center"
          justifyContent="center"
          sx={{
            aspectRatio: "4 / 3",
            borderRadius: "12px",
            border: "1px dashed rgba(0,0,0,0.16)",
          }}
        >
          {processing ? (
            <>
              <Loading />
              <Typography variant="caption1">사진을 준비하고 있습니다</Typography>
            </>
          ) : (
            <>
              <Typography variant="body2">발견한 동물의 사진 한 장</Typography>
              <FlexBox gap="8px">
                {cameraAvailable ? (
                  <Button onClick={() => camera.current?.open()}>사진 찍기</Button>
                ) : null}
                <Button
                  variant={cameraAvailable ? "outlined" : "solid"}
                  onClick={() => library.current?.open()}
                >
                  앨범에서 고르기
                </Button>
              </FlexBox>
            </>
          )}
        </FlexBox>
      )}

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="headline2" weight="bold">
          지금 어떤 상황입니까
        </Typography>
        <FlexBox gap="8px" flexWrap="wrap">
          {CARE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={careSituation === option.value}
              onClick={() => onCareSituation(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </FlexBox>
        {careSituation === null ? (
          <Typography variant="caption1">
            둘 중 하나를 골라야 다음으로 넘어갑니다
          </Typography>
        ) : null}
      </FlexBox>

      {cameraAvailable ? (
        <PhotoPickerInput ref={camera} mode="camera" onFiles={onFiles} />
      ) : null}
      <PhotoPickerInput ref={library} mode="library" onFiles={onFiles} />
    </FlexBox>
  );
}
