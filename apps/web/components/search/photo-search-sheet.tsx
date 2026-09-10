"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HStack, Icon, ImageFrame, Text, VStack } from "@seed-design/react";
import { IconCameraLine, IconPictureLine } from "@karrotmarket/react-monochrome-icon";
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

  const cameraRef = useRef<PhotoPickerInputHandle>(null);
  const libraryRef = useRef<PhotoPickerInputHandle>(null);

  const picker = usePhotoPicker({ maxCount: 1 });
  const photo = picker.photos[0] ?? null;
  const file = photo?.file ?? null;

  // 사진이 정해지면 올리고 이어서 분석까지 한 번에 진행함
  const run = useCallback(
    async (next: File) => {
      setError(null);
      const uploadId = await upload.upload(next);
      if (!uploadId) {
        setError("사진을 올리지 못했습니다. 다시 골라 주십시오");
        return;
      }
      analyze.start(uploadId);
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
  const busy = upload.status === "uploading" || analyze.status === "loading";

  const search = () => {
    if (!draft) return;
    const params = new URLSearchParams({ animalType: draft.animalType });
    if (draft.size !== "unknown") params.set("size", draft.size);
    if (draft.color.length > 0) params.set("colors", draft.color.join(","));
    onOpenChange(false);
    router.push(`/search?${params.toString()}`);
  };

  const found = draft
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
              사진 속 동물의 종류와 털색, 크기로 비슷한 제보를 찾습니다. 품종은 추정으로만 씁니다
            </Text>

            {photo ? (
              <HStack gap="x3" align="center">
                <ImageFrame
                  ratio={1}
                  width="80px"
                  src={photo.previewUrl}
                  alt="고른 사진"
                  borderRadius="r3"
                />
                <VStack align="stretch" gap="x1" minWidth="0">
                  {busy ? (
                    <HStack gap="x2" align="center">
                      <ProgressCircle size="24" />
                      <Text textStyle="t4Regular" color="fg.neutralMuted">
                        사진을 살펴보고 있습니다
                      </Text>
                    </HStack>
                  ) : found ? (
                    <>
                      <Text textStyle="t4Bold" color="fg.neutral">
                        {found}
                      </Text>
                      <Text textStyle="t3Regular" color="fg.neutralSubtle">
                        이 조건으로 최근 제보를 찾습니다
                      </Text>
                    </>
                  ) : analyze.status === "failed" ? (
                    <Text textStyle="t4Regular" color="fg.neutralMuted">
                      사진을 살펴보지 못했습니다. 글자로 검색하거나 잠시 후 다시 시도해 주십시오
                    </Text>
                  ) : (
                    <Text textStyle="t4Regular" color="fg.neutralMuted">
                      사진에서 동물을 찾지 못했습니다. 다른 사진을 골라 주십시오
                    </Text>
                  )}
                </VStack>
              </HStack>
            ) : null}

            {notice ? <Callout tone="informative" description={notice} /> : null}

            <HStack gap="x3">
              <VStack asChild align="center" gap="x1" py="x4" grow={1} borderRadius="r3" bg="bg.neutralWeak">
                <button type="button" onClick={() => cameraRef.current?.open()}>
                  <Icon svg={<IconCameraLine />} color="fg.neutral" />
                  <Text textStyle="t3Bold" color="fg.neutral">
                    카메라
                  </Text>
                </button>
              </VStack>
              <VStack asChild align="center" gap="x1" py="x4" grow={1} borderRadius="r3" bg="bg.neutralWeak">
                <button type="button" onClick={() => libraryRef.current?.open()}>
                  <Icon svg={<IconPictureLine />} color="fg.neutral" />
                  <Text textStyle="t3Bold" color="fg.neutral">
                    앨범
                  </Text>
                </button>
              </VStack>
            </HStack>

            <PhotoPickerInput
              ref={cameraRef}
              mode="camera"
              onFiles={(files) => void picker.replaceFiles(files)}
            />
            <PhotoPickerInput
              ref={libraryRef}
              mode="library"
              onFiles={(files) => void picker.replaceFiles(files)}
            />
          </VStack>
        </BottomSheetBody>
        <BottomSheetFooter>
          <ActionButton variant="brandSolid" size="large" disabled={!draft || busy} onClick={search}>
            비슷한 제보 찾기
          </ActionButton>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
