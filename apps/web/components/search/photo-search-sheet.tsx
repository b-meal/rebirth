"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import { IconPictureLine, IconXmarkFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { Callout } from "seed-design/ui/callout";
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
        setError("사진을 올리지 못했어요. 다시 골라 주세요");
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

  const draft = analyze.draft;
  // 사진이 있는데 아직 결과가 없으면 살펴보는 중. 올리기 전 한 프레임도 여기에 들어감
  const settled =
    analyze.status === "done" || analyze.status === "failed" || upload.status === "failed";
  const busy = Boolean(photo) && !settled;

  // 동물이 안 보이면 종류도 털색도 못 뽑아 찾을 조건이 남지 않음
  const rejected = analyze.advice === "not-animal";
  const ready = Boolean(draft) && !rejected;

  const discard = () => {
    if (!photo) return;
    picker.removePhoto(photo.id);
    started.current = null;
    analyze.clear();
    upload.clear();
    setError(null);
  };

  const search = () => {
    if (!draft || rejected) return;
    const params = new URLSearchParams({ animalType: draft.animalType });
    if (draft.size !== "unknown") params.set("size", draft.size);
    if (draft.color.length > 0) params.set("colors", draft.color.join(","));
    onOpenChange(false);
    router.push(`/search?${params.toString()}`);
  };

  const found =
    ready && draft
      ? [ANIMAL_LABEL[draft.animalType], breedLabel(draft.breedGuess), SIZE_LABEL[draft.size]]
          .filter((value): value is string => Boolean(value))
          .concat(draft.color)
          .join(", ")
      : null;

  const notice = error ?? picker.error ?? (analyze.status === "failed" ? analyze.message : null);

  return (
    <BottomSheetRoot open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BottomSheetContent title="사진으로 찾기">
        <BottomSheetBody>
          <VStack align="stretch" gap="x4">
            <Text textStyle="t4Regular" color="fg.neutralMuted">
              사진 속 동물의 종류와 털색, 크기로 비슷한 제보를 찾아요. 품종은 추정으로만 써요
            </Text>

            {photo ? (
              <HStack gap="x3" align="center">
                <ImageFrame
                  ratio={1}
                  width="80px"
                  src={photo.previewUrl}
                  alt="고른 사진"
                  borderRadius="r3"
                >
                  {/* 제보하기 1단계와 같은 표시. 덮개 전체가 지우는 자리라 누를 곳을 찾지 않아도 됨 */}
                  {rejected ? (
                    <VStack
                      asChild
                      position="absolute"
                      top="0"
                      right="0"
                      bottom="0"
                      left="0"
                      align="center"
                      justify="center"
                      bg="palette.staticBlackAlpha500"
                    >
                      {/* design-system-allow:raw-element 사진 전체를 덮는 자리라 button 이 필요함 */}
                      <button
                        type="button"
                        aria-label="사진에서 동물이 보이지 않음, 눌러서 지우기"
                        onClick={discard}
                      >
                        <VStack
                          align="center"
                          justify="center"
                          width="x7"
                          height="x7"
                          borderRadius="full"
                          bg="bg.criticalSolid"
                        >
                          <Icon svg={<IconXmarkFill />} size="x5" color="fg.criticalContrast" />
                        </VStack>
                      </button>
                    </VStack>
                  ) : null}
                </ImageFrame>
                <VStack align="stretch" gap="x1" minWidth="0">
                  {busy ? (
                    <HStack gap="x2" align="center">
                      <ProgressCircle size="24" />
                      <Text textStyle="t4Regular" color="fg.neutralMuted">
                        사진을 살펴보고 있어요
                      </Text>
                    </HStack>
                  ) : rejected ? (
                    <>
                      <Text textStyle="t4Bold" color="fg.critical">
                        동물이 보이지 않아요
                      </Text>
                      <Text textStyle="t3Regular" color="fg.neutralSubtle">
                        사진을 지우고 동물이 담긴 사진으로 다시 골라 주세요
                      </Text>
                    </>
                  ) : found ? (
                    <>
                      <Text textStyle="t4Bold" color="fg.neutral">
                        {found}
                      </Text>
                      <Text textStyle="t3Regular" color="fg.neutralSubtle">
                        이 조건으로 최근 제보를 찾아요
                      </Text>
                    </>
                  ) : analyze.status === "failed" ? (
                    <Text textStyle="t4Regular" color="fg.neutralMuted">
                      사진을 살펴보지 못했어요. 글자로 검색하거나 잠시 후 다시 시도해 주세요
                    </Text>
                  ) : null}
                </VStack>
              </HStack>
            ) : null}

            {notice ? <Callout tone="informative" description={notice} /> : null}

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
