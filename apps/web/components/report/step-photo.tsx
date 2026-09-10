"use client";

import { Text, VStack } from "@seed-design/react";

import type { PhotoPickerState } from "@/hooks/use-photo-picker";
import { PhotoField } from "@/components/ui/photo-field";
import { Section } from "@/components/ui/screen";

// 1단계 사진 한 장. 현장에서 지금 찍은 사진만 받고 카메라가 없는 기기에서만 앨범을 엶
// 서버로 올리지 않는 단계라 업로드 상태를 다루지 않음

// 레퍼런스가 오면 이 문안 자리에 예시 이미지를 붙임
const TIPS = [
  "동물 전체가 프레임에 들어오게",
  "정면이나 옆에서 한 걸음 가까이",
  "목줄이 있으면 보이도록",
  "쫓아가지 말고 멀리서",
];

export type StepPhotoProps = {
  /** 썸네일 삭제 오류를 함께 다루는 공용 선택기를 그대로 씀 */
  picker: PhotoPickerState;
  /** 장치 조회가 끝나기 전에는 null. 모바일이 기본이라 그동안 촬영으로 둠 */
  cameraAvailable: boolean | null;
};

export function StepPhoto({ picker, cameraAvailable }: StepPhotoProps) {
  // 조회 중에는 촬영으로 두고, 카메라가 없다고 확인되면 그때만 앨범을 엶
  const camera = cameraAvailable !== false;

  return (
    <VStack align="stretch" gap="x5">
      <Text as="h2" textStyle="t7Bold" color="fg.neutral">
        발견한 동물을 찍어 주세요
      </Text>

      <Section gap="x2">
        {TIPS.map((tip) => (
          <Text key={tip} textStyle="t4Regular" color="fg.neutralMuted">
            · {tip}
          </Text>
        ))}
      </Section>

      <PhotoField
        picker={picker}
        label="사진"
        hint={
          camera
            ? "지금 보이는 모습을 한 장 찍어 주세요"
            : "카메라를 찾지 못해 앨범에서 고를 수 있어요"
        }
        cameraAvailable={camera}
        libraryAvailable={!camera}
      />
    </VStack>
  );
}
