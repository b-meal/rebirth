"use client";

import type { CareSituation } from "@rebirth/types";
import { HStack, Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";

import type { PhotoPickerState } from "@/hooks/use-photo-picker";
import { PhotoField } from "@/components/ui/photo-field";
import { Section } from "@/components/ui/screen";

// 1단계 사진과 보호 상황, 보호 상황이 이후 안내를 갈라 여기서 받음

// 실종 신고에만 쓰는 unknown 은 제보 폼에 내놓지 않음
const CARE_OPTIONS: { value: Exclude<CareSituation, "unknown">; label: string }[] = [
  { value: "roaming", label: "배회 중" },
  { value: "in_care", label: "내가 데리고 있음" },
];

export type StepPhotoProps = {
  /** 썸네일 삭제 오류를 함께 다루는 공용 선택기를 그대로 씀 */
  picker: PhotoPickerState;
  careSituation: CareSituation | null;
  /** 선택은 끝났고 서버로 올리는 중 */
  uploading: boolean;
  /** 업로드 단계에서 생긴 오류, 선택 오류는 PhotoField 가 직접 보임 */
  uploadError: string | null;
  /** 데스크톱 프레임에서는 촬영 버튼을 렌더하지 않고 앨범만 노출 */
  cameraAvailable: boolean;
  onCareSituation: (value: CareSituation) => void;
};

export function StepPhoto({
  picker,
  careSituation,
  uploading,
  uploadError,
  cameraAvailable,
  onCareSituation,
}: StepPhotoProps) {
  return (
    <VStack align="stretch" gap="x5">
      <Text as="h2" textStyle="t7Bold" color="fg.neutral">
        사진을 올려 주십시오
      </Text>

      <PhotoField
        picker={picker}
        label="대표 사진"
        hint="발견한 동물의 사진 한 장"
        disabled={uploading}
        cameraAvailable={cameraAvailable}
      />

      {uploading ? (
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          사진을 올리고 있습니다
        </Text>
      ) : null}

      {uploadError ? <Callout tone="critical" description={uploadError} /> : null}

      <Section>
        <Text as="h3" textStyle="t5Bold" color="fg.neutral">
          지금 어떤 상황입니까
        </Text>
        <Chip.RadioRoot
          value={careSituation ?? ""}
          onValueChange={(value) => onCareSituation(value as CareSituation)}
          aria-label="보호 상황"
        >
          <HStack gap="spacingX.betweenChips" wrap>
            {CARE_OPTIONS.map((option) => (
              <Chip.RadioItem key={option.value} value={option.value}>
                <Chip.Label>{option.label}</Chip.Label>
              </Chip.RadioItem>
            ))}
          </HStack>
        </Chip.RadioRoot>
        {careSituation === null ? (
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            둘 중 하나를 골라야 다음으로 넘어갑니다
          </Text>
        ) : null}
      </Section>
    </VStack>
  );
}
