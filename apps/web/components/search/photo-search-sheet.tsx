"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import { IconPictureLine } from "@karrotmarket/react-monochrome-icon";
import { needsRetake } from "@rebirth/types";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { ProgressCircle } from "seed-design/ui/progress-circle";

import { ANIMAL_LABEL, SIZE_LABEL, breedLabel } from "@/lib/report-label";
import { useAnalyzePhoto } from "@/hooks/use-analyze-photo";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import {
  PhotoPickerInput,
  type PhotoPickerInputHandle,
} from "@/components/ui/photo-picker-input";

// 사진으로 비슷한 유형을 찾음, 제보 등록과 같은 업로드와 분석 경로를 그대로 씀
// 시트가 닫히면 고른 사진과 판정을 모두 비움. 다음에 열 때 앞 사진이 남아 있으면 새로 고르려던 사람이 헷갈림

export type PhotoSearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PhotoSearchSheet({ open, onOpenChange }: PhotoSearchSheetProps) {
  const router = useRouter();
  const upload = usePhotoUpload();
  const analyze = useAnalyzePhoto();
  const [error, setError] = useState<string | null>(null);

  const libraryRef = useRef<PhotoPickerInputHandle>(null);

  const picker = usePhotoPicker({ maxCount: 1 });
  const photo = picker.photos[0] ?? null;
  const file = photo?.file ?? null;

  // 사진이 정해지면 올리고 이어서 분석까지 한 번에 진행함
  const run = useCallback(
    async (next: File) => {
      setError(null);
      // 앞 사진의 판정이 남아 있으면 새 사진에 그대로 붙어 보임
      analyze.clear();
      const uploadId = await upload.upload(next);
      if (!uploadId) {
        setError("사진을 올리지 못했어요");
        return;
      }
      analyze.start([uploadId]);
    },
    [upload, analyze],
  );

  const started = useRef<File | null>(null);
  useEffect(() => {
    if (!file || started.current === file) return;
    started.current = file;
    void run(file);
  }, [file, run]);

  const reset = () => {
    picker.clear();
    started.current = null;
    analyze.clear();
    upload.clear();
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const draft = analyze.draft;
  // 사진이 있는데 아직 결과가 없으면 살펴보는 중. 올리기 전 한 프레임도 여기에 들어감
  const settled =
    analyze.status === "done" || analyze.status === "failed" || upload.status === "failed";
  const busy = Boolean(photo) && !settled;

  // 동물이 안 보이거나 종류를 못 뽑으면 찾을 조건이 남지 않음. 확인 어려움 으로 찾으면 아무 뜻 없는 결과가 나옴
  const noAnimal = analyze.advice === "not-animal";
  const unclear = !noAnimal && Boolean(draft) && needsRetake(draft!);
  const failed = error !== null || analyze.status === "failed";
  const ready = Boolean(draft) && !noAnimal && !unclear;

  const search = () => {
    if (!draft || !ready) return;
    const params = new URLSearchParams({ animalType: draft.animalType });
    if (draft.size !== "unknown") params.set("size", draft.size);
    if (draft.color.length > 0) params.set("colors", draft.color.join(","));
    handleOpenChange(false);
    router.push(`/search?${params.toString()}`);
  };

  // 품종은 breedLabel 이 계열 추정으로만 부르므로 따로 설명하지 않음
  const found =
    ready && draft
      ? [ANIMAL_LABEL[draft.animalType], breedLabel(draft.breedGuess), SIZE_LABEL[draft.size]]
          .filter((value): value is string => Boolean(value))
          .concat(draft.color)
          .join(", ")
      : null;

  return (
    <BottomSheetRoot open={open} onOpenChange={handleOpenChange}>
      <BottomSheetContent title="사진으로 찾기">
        <BottomSheetBody>
          <VStack align="stretch" gap="x4">
            {photo ? (
              <HStack gap="x3" align="center">
                <ImageFrame
                  ratio={1}
                  width="80px"
                  src={photo.previewUrl}
                  alt="고른 사진"
                  borderRadius="r3"
                />
                {/* 한 줄로 지금 상태만 말함. 다음 할 일은 아래 단추 이름이 이미 말하고 있음 */}
                <VStack align="stretch" gap="x2" minWidth="0">
                  {busy ? (
                    <HStack gap="x2" align="center">
                      <ProgressCircle size="24" />
                      <Text textStyle="t4Regular" color="fg.neutralMuted">
                        사진을 살펴보고 있어요
                      </Text>
                    </HStack>
                  ) : noAnimal ? (
                    <Text textStyle="t4Bold" color="fg.critical">
                      동물이 보이지 않아요
                    </Text>
                  ) : unclear ? (
                    <Text textStyle="t4Bold" color="fg.critical">
                      동물을 알아보기 어려워요
                    </Text>
                  ) : found ? (
                    <Text textStyle="t4Bold" color="fg.neutral">
                      {found}
                    </Text>
                  ) : failed ? (
                    <>
                      <Text textStyle="t4Regular" color="fg.neutralMuted">
                        {error ?? "사진을 살펴보지 못했어요"}
                      </Text>
                      <HStack>
                        <ActionButton
                          variant="neutralOutline"
                          size="xsmall"
                          onClick={() => file && void run(file)}
                        >
                          다시 시도
                        </ActionButton>
                      </HStack>
                    </>
                  ) : null}
                </VStack>
              </HStack>
            ) : (
              <Text textStyle="t4Regular" color="fg.neutralMuted">
                동물 사진을 고르면 종류, 털색, 크기가 비슷한 제보를 찾아요
              </Text>
            )}

            {/* 카메라와 앨범을 나눠 놓지 않음
                기기가 입력 하나로 보관함과 촬영을 함께 물어 나눠 두면 같은 물음이 두 번 나옴 */}
            <VStack asChild align="center" gap="x1" py="x4" borderRadius="r3" bg="bg.neutralWeak">
              {/* design-system-allow:raw-element 넓은 면 전체를 누르는 자리라 button 이 필요함 */}
              <button type="button" onClick={() => libraryRef.current?.open()}>
                <Icon svg={<IconPictureLine />} color="fg.neutral" />
                <Text textStyle="t3Bold" color="fg.neutral">
                  {photo ? "다른 사진 고르기" : "사진 고르기"}
                </Text>
              </button>
            </VStack>

            {/* 고르기 단계의 문제는 사진이 없어 위 줄에 실을 수 없으니 단추 아래 한 줄로 둠 */}
            {!photo && picker.error ? (
              <Text textStyle="t3Regular" color="fg.critical">
                {picker.error}
              </Text>
            ) : null}

            <PhotoPickerInput
              ref={libraryRef}
              mode="library"
              onFiles={(files) => void picker.replaceFiles(files)}
            />
          </VStack>
        </BottomSheetBody>
        <BottomSheetFooter>
          <ActionButton variant="brandSolid" size="large" disabled={!ready || busy} onClick={search}>
            비슷한 제보 찾기
          </ActionButton>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
