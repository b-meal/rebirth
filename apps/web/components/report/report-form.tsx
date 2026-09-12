"use client";

import { CONSENT_DOCUMENT_VERSION, type CareSituation } from "@rebirth/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";

import { useAnalyzePhoto } from "@/hooks/use-analyze-photo";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import { useReportDraft, type ReportDraft, type ReportStep } from "@/hooks/use-report-draft";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";
import { AppHeader } from "@/components/ui/app-header";
import { ReportDraftCard } from "./report-draft-card";
import { ReportFeatureForm } from "./report-feature-form";
import { ReportLocation, type LocationValue } from "./report-location";
import { ReportPhotoHero } from "./report-photo-hero";
import { ReportCapture } from "./report-capture";

// 촬영과 등록 두 단계를 한 라우트에서 클라이언트 상태로 돌리고 뒤로가기는 단계 하나만 되돌림

const TOTAL_STEPS = 2;

/** 대표 사진 한 장과 보조 한 장. 서버 상한은 더 크지만 제보 흐름은 두 장만 받음 */
const MAX_PHOTOS = 2;

const STEP_LABEL: Record<ReportStep, string> = {
  1: "사진",
  2: "제보 등록",
};

// 실종 신고에만 쓰는 unknown 은 제보 폼에 내놓지 않음
const CARE_OPTIONS: { value: Exclude<CareSituation, "unknown">; label: string }[] = [
  { value: "roaming", label: "배회 중" },
  { value: "in_care", label: "내가 데리고 있음" },
];

function readStepFromUrl(): ReportStep {
  if (typeof window === "undefined") return 1;
  const raw = Number(new URLSearchParams(window.location.search).get("step"));
  return raw >= 1 && raw <= TOTAL_STEPS ? (raw as ReportStep) : 1;
}

/** 카메라 유무는 화면 폭이 아니라 장치 목록으로 판단함. 큰 화면 노트북도 촬영할 수 있음 */
async function detectCamera(): Promise<boolean> {
  const media = navigator.mediaDevices;
  if (!media?.enumerateDevices) {
    // 장치를 조회할 수 없으면 좁은 화면에서만 촬영으로 봄
    return window.matchMedia("(max-width: 1023px)").matches;
  }
  try {
    const devices = await media.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch {
    return false;
  }
}

export function ReportForm() {
  const router = useRouter();
  const [step, setStep] = useState<ReportStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 서버는 장치 목록을 몰라 null 로 시작하고 마운트 뒤에만 확정함
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  // 사진 순서대로 받은 참조. 훅은 한 장씩 올리므로 결과를 여기에 모음
  const [uploadIds, setUploadIds] = useState<string[]>([]);
  // 초안을 고칠 때만 여는 상세 입력
  const [formOpen, setFormOpen] = useState(false);

  const { draft, photos, setPhotos, applyAiDraft, edit, reset } = useReportDraft();
  const analyze = useAnalyzePhoto();
  const upload = usePhotoUpload();

  // 저장 요청 하나를 가리키는 키, 이중 탭과 재시도가 제보를 두 건 만들지 않음
  const idempotencyKey = useRef<string | null>(null);

  const picker = usePhotoPicker({
    maxCount: MAX_PHOTOS,
    onChange: (next) => {
      setPhotos(next);
      // 사진이 바뀌면 이전 분석과 업로드 결과를 쓰지 않음
      analyze.clear();
      upload.clear();
      setUploadIds([]);
    },
  });

  useEffect(() => {
    // 사진은 File 이라 복원되지 않으므로 새로고침은 늘 1단계에서 다시 시작함
    const url = new URL(window.location.href);
    if (url.searchParams.has("step")) {
      url.searchParams.delete("step");
      window.history.replaceState({ step: 1 }, "", url);
    }

    let alive = true;
    void detectCamera().then((available) => {
      if (alive) setCameraAvailable(available);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 뒤로가기로 단계가 하나 되돌아가게 함
  useEffect(() => {
    const onPop = () => setStep(readStepFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 사진 확정 전에는 서버에 올리지 않음. 다시 찍기를 반복해도 스토리지에 쌓이지 않음
  // 같은 사진 묶음은 한 번만 올려 StrictMode 의 이펙트 두 번 실행에서도 두 건이 생기지 않음
  const uploadedKey = useRef<string | null>(null);
  const { upload: startUpload } = upload;
  useEffect(() => {
    if (step !== 2 || photos.length === 0) return;
    const key = photos.map((photo) => photo.id).join(",");
    if (uploadedKey.current === key) return;
    uploadedKey.current = key;

    void (async () => {
      const ids: string[] = [];
      // 훅이 앞 요청을 취소하므로 순서대로 올림
      for (const photo of photos) {
        const id = await startUpload(photo.file);
        if (id) ids.push(id);
      }
      setUploadIds(ids);
    })();
  }, [step, photos, startUpload]);

  // 올린 사진을 모두 한 요청에 넣어 초안 하나를 받음. 호출은 사진 수와 무관하게 한 번
  const { status: analyzeStatus, start: startAnalyze } = analyze;
  useEffect(() => {
    if (step !== 2 || uploadIds.length === 0) return;
    if (analyzeStatus === "idle") startAnalyze(uploadIds);
  }, [step, uploadIds, analyzeStatus, startAnalyze]);

  const goTo = useCallback((next: ReportStep) => {
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    window.history.pushState({ step: next }, "", url);
    window.scrollTo({ top: 0 });
  }, []);

  // 분석 결과가 오면 초안을 채움, 사용자가 이미 고친 필드는 덮지 않음
  useEffect(() => {
    if (analyze.status !== "done" || !analyze.draft) return;
    applyAiDraft(analyze.draft, analyze.model ?? "", analyze.analyzedAt ?? "");
  }, [analyze.status, analyze.draft, analyze.model, analyze.analyzedAt, applyAiDraft]);

  const onLocationChange = useCallback(
    (next: Partial<LocationValue>) => {
      for (const [key, value] of Object.entries(next)) {
        edit(key as keyof ReportDraft, value as ReportDraft[keyof ReportDraft]);
      }
    },
    [edit],
  );

  // 업로드를 기다리지 않고 넘어감, 등록 버튼에서만 참조가 필요함
  const uploadsReady = uploadIds.length === photos.length && uploadIds.length > 0;
  // 동물이 안 보이는 사진은 등록을 막음. 어두운 사진은 막지 않고 안내만 함
  const notAnimal = analyze.advice === "not-animal";
  const canSubmit =
    uploadsReady && draft.locationToken !== null && draft.careSituation !== null && !notAnimal;

  const handleSubmit = useCallback(async () => {
    if (uploadIds.length === 0 || !draft.locationToken) return;
    setSubmitting(true);
    setSubmitError(null);

    // 재시도에서도 같은 키를 씀, 앞선 요청이 저장됐으면 그 결과를 그대로 받음
    idempotencyKey.current ??= crypto.randomUUID();

    const payload = {
      kind: "sighting" as const,
      careSituation: draft.careSituation,
      animalType: draft.animalType,
      breedGuess: draft.breedGuess.trim() || null,
      // 첫 줄이 제목, 빈 줄 뒤가 본문. 상세와 공유 카드가 첫 줄을 제목으로 읽음
      appearance: [draft.appearance, draft.story].filter(Boolean).join("\n\n"),
      colors: draft.colors,
      size: draft.size,
      conditionTags: draft.conditionTags,
      collar: draft.collar,
      injury: draft.injury,
      earTip: draft.earTip,
      uploadIds,
      locationToken: draft.locationToken,
      ...(draft.landmark && { landmarkNote: draft.landmark }),
      // 촬영 직후 등록이라 입력을 받지 않고 제출 시각으로 둠
      occurredAt: draft.occurredAt || new Date().toISOString(),
      aiEditedFields: draft.editedFields,
      idempotencyKey: idempotencyKey.current,
      consents: {
        requiredTerms: true,
        requiredPrivacy: true,
        // AI 초안을 받았으면 그 처리에 동의한 것으로 기록함
        optionalAi: draft.aiRaw !== null,
        optionalLocation: draft.usableForDistance,
        documentVersion: CONSENT_DOCUMENT_VERSION,
      },
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        id?: string;
        pending?: boolean;
        message?: string;
      };

      // 앞선 요청이 아직 처리 중, 키를 유지한 채 다시 누르게 함
      if (response.status === 202 || result.pending) {
        setSubmitError("저장하고 있어요. 잠시 후 다시 눌러 주세요");
        setSubmitting(false);
        return;
      }

      if (!response.ok || !result.id) {
        // 입력값은 그대로 두고 재시도만 노출
        setSubmitError(result.message ?? "제보가 저장되지 않았어요. 다시 시도해 주세요");
        setSubmitting(false);
        return;
      }

      reset();
      // 뒤로가기로 폼에 돌아가지 않게 push 가 아니라 replace 로 완료 화면에 들어감
      router.replace(`/r/${result.id}/done`);
    } catch {
      setSubmitError("제보가 저장되지 않았어요. 입력한 내용은 그대로 있어요");
      setSubmitting(false);
    }
  }, [uploadIds, draft, reset, router]);

  const loadingDraft =
    upload.status !== "failed" &&
    (analyze.status === "loading" || analyze.status === "idle");

  return (
    <Screen>
      <AppHeader title="제보하기" />
      {step === 1 ? (
        <ReportCapture
          picker={picker}
          cameraAvailable={cameraAvailable}
          step={step}
          total={TOTAL_STEPS}
          label={STEP_LABEL[step]}
          onNext={() => goTo(2)}
        />
      ) : (
        <>
          <ReportPhotoHero
            photos={photos}
            step={step}
            total={TOTAL_STEPS}
            label={STEP_LABEL[step]}
            onRetake={() => goTo(1)}
          />

          <ScreenBody gap="x4" pt="x4" pb="x4">
            {upload.status === "uploading" ? (
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                사진을 올리고 있어요
              </Text>
            ) : null}

            {upload.status === "failed" ? (
              <Callout tone="critical" description={upload.message ?? ""} />
            ) : null}

            <ReportDraftCard
              draft={draft}
              loading={loadingDraft}
              advice={analyze.advice}
              message={analyze.message}
              onEdit={() => setFormOpen(true)}
              onRetake={() => goTo(1)}
            />

            <Section gap="x2">
              <HStack gap="x1_5" align="center">
                <Text as="h3" textStyle="t5Bold" color="fg.neutral">
                  지금 어떤 상황인가요
                </Text>
                <Text textStyle="t2Regular" color="fg.brand">
                  직접 골라 주세요
                </Text>
              </HStack>
              <Chip.RadioRoot
                value={draft.careSituation ?? ""}
                onValueChange={(value) => edit("careSituation", value as CareSituation)}
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
            </Section>

            <ReportLocation
              sessionReady={uploadIds.length > 0}
              value={{
                areaName: draft.areaName,
                locationToken: draft.locationToken,
                usableForDistance: draft.usableForDistance,
                landmark: draft.landmark,
              }}
              onChange={onLocationChange}
            />

            {submitError ? <Callout tone="critical" description={submitError} /> : null}

            {/* 하단 CTA 가 화면에 붙어 있어 마지막 입력이 그 아래로 빠져나갈 자리 */}
            <Box height="x8" />
          </ScreenBody>

          {/* pb 는 유틸이 안전 영역을 더해 다시 잡으므로 여기서 주지 않음 */}
          <VStack
            className="rebirth-bottom-bar"
            position="sticky"
            bottom="0"
            zIndex={1}
            align="stretch"
            px="spacingX.globalGutter"
            pt="x3"
            bg="bg.layerDefault"
            borderTopWidth="1px"
            borderColor="stroke.neutralMuted"
          >
            <ActionButton
              variant="brandSolid"
              size="large"
              loading={submitting}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              제보하기
            </ActionButton>
          </VStack>

          <BottomSheetRoot open={formOpen} onOpenChange={(open) => setFormOpen(open)}>
            <BottomSheetContent title="초안 고치기">
              <BottomSheetBody>
                {/* 마지막 입력이 시트 경계에 붙지 않게 아래에 여백을 둠 */}
                <Box maxHeight="60dvh" overflowY="auto" pb="x5">
                  <ReportFeatureForm draft={draft} onEdit={edit} />
                </Box>
              </BottomSheetBody>
            </BottomSheetContent>
          </BottomSheetRoot>
        </>
      )}
    </Screen>
  );
}
