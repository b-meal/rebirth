"use client";

import { CONSENT_DOCUMENT_VERSION } from "@rebirth/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Flex, Progress, Text } from "@chakra-ui/react";

import { useAnalyzePhoto } from "@/hooks/use-analyze-photo";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import {
  useReportDraft,
  type ReportDraft,
  type ReportStep,
} from "@/hooks/use-report-draft";
import { StepFeatures } from "./step-features";
import { StepLocation, type LocationValue } from "./step-location";
import { StepPhoto } from "./step-photo";
import { StepStatus } from "./step-status";

// 한 라우트에서 4단계를 클라이언트 상태로 돌림
// ?step=n 을 pushState 로 넣어 뒤로가기가 단계 하나만 되돌림

const TOTAL_STEPS = 4;

const STEP_LABEL: Record<ReportStep, string> = {
  1: "사진",
  2: "위치",
  3: "특징",
  4: "상태",
};

function readStepFromUrl(): ReportStep {
  if (typeof window === "undefined") return 1;
  const raw = Number(new URLSearchParams(window.location.search).get("step"));
  return raw >= 1 && raw <= TOTAL_STEPS ? (raw as ReportStep) : 1;
}

/** 카메라 유무는 화면 폭이 아니라 장치 목록으로 판단함. 큰 화면 노트북도 촬영할 수 있음 */
async function detectCamera(): Promise<boolean> {
  const media = navigator.mediaDevices;
  if (!media?.enumerateDevices) {
    // 장치를 조회할 수 없으면 좁은 화면에서만 촬영을 내놓음
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
  // 서버는 뷰포트를 몰라 null 로 시작함. 마운트 뒤에만 촬영 버튼을 렌더해
  // 서버 HTML 과 첫 클라이언트 렌더가 어긋나지 않게 함
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  const { draft, photo, setPhoto, applyAiDraft, edit, reset } = useReportDraft();
  const analyze = useAnalyzePhoto();
  const upload = usePhotoUpload();

  // 저장 요청 하나를 가리키는 키. 이중 탭과 재시도가 제보를 두 건 만들지 않음
  const idempotencyKey = useRef<string | null>(null);

  const picker = usePhotoPicker({
    maxCount: 1,
    onChange: (photos) => {
      const next = photos[0] ?? null;
      setPhoto(next);
      // 대표 사진이 바뀌면 이전 분석과 업로드 결과를 쓰지 않음
      analyze.clear();
      upload.clear();
      // 고른 즉시 올려 둠. 2단계에서 위치를 정하는 동안 업로드가 끝남
      if (next) void upload.upload(next.file);
    },
  });

  useEffect(() => {
    const fromUrl = readStepFromUrl();
    // 하이드레이션 직후 값이라 렌더 연쇄를 피해 마이크로태스크로 미룸
    queueMicrotask(() => setStep(fromUrl));

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

  const goTo = useCallback((next: ReportStep) => {
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    window.history.pushState({ step: next }, "", url);
    window.scrollTo({ top: 0 });
  }, []);

  // 분석 결과가 오면 초안을 채움. 사용자가 이미 고친 필드는 덮지 않음
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

  // 업로드가 끝나야 다음으로 감. 참조 없이는 저장할 수 없음
  const canLeaveStep1 =
    photo !== null && draft.careSituation !== null && upload.status === "ready";
  const canLeaveStep2 = draft.locationToken !== null;

  const handleNext = useCallback(() => {
    if (step === 1) {
      // 올린 사진의 참조로 분석을 백그라운드로 시작
      if (upload.uploadId && analyze.status === "idle") {
        analyze.start(upload.uploadId);
      }
      goTo(2);
      return;
    }
    if (step < TOTAL_STEPS) goTo((step + 1) as ReportStep);
  }, [step, upload.uploadId, analyze, goTo]);

  const handleSubmit = useCallback(async () => {
    if (!upload.uploadId || !draft.locationToken) return;
    setSubmitting(true);
    setSubmitError(null);

    // 재시도에서도 같은 키를 씀. 앞선 요청이 저장됐으면 그 결과를 그대로 받음
    idempotencyKey.current ??= crypto.randomUUID();

    const payload = {
      kind: "sighting" as const,
      careSituation: draft.careSituation,
      animalType: draft.animalType,
      appearance: draft.appearance,
      colors: draft.colors,
      size: draft.size,
      conditionTags: draft.conditionTags,
      collar: draft.collar,
      injury: draft.injury,
      earTip: draft.earTip,
      uploadIds: [upload.uploadId],
      locationToken: draft.locationToken,
      ...(draft.landmark && { landmarkNote: draft.landmark }),
      // 4단계에서 채우지만 비어 있으면 제출 시각으로 둠
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

      // 앞선 요청이 아직 처리 중. 키를 유지한 채 다시 누르게 함
      if (response.status === 202 || result.pending) {
        setSubmitError("저장하고 있습니다. 잠시 후 다시 눌러 주십시오");
        setSubmitting(false);
        return;
      }

      if (!response.ok || !result.id) {
        // 입력값은 그대로 두고 재시도만 노출
        setSubmitError(
          result.message ?? "제보가 저장되지 않았습니다. 다시 시도해 주십시오",
        );
        setSubmitting(false);
        return;
      }

      // 완료 화면을 따로 만들지 않고 상세로 바로 보냄
      reset();
      router.push(`/r/${result.id}`);
    } catch {
      setSubmitError("제보가 저장되지 않았습니다. 입력한 내용은 그대로 있습니다");
      setSubmitting(false);
    }
  }, [upload.uploadId, draft, reset, router]);

  return (
    <Flex direction="column" gap="5" padding="5" paddingBottom="24">
      <Flex direction="column" gap="2">
        <Progress.Root
          value={(step / TOTAL_STEPS) * 100}
          colorPalette="brand"
          size="sm"
        >
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        <Text textStyle="sm" color="fg.alternative">
          {step} / {TOTAL_STEPS} · {STEP_LABEL[step]}
        </Text>
      </Flex>

      {step === 1 ? (
        <StepPhoto
          picker={picker}
          careSituation={draft.careSituation}
          uploading={upload.status === "uploading"}
          uploadError={picker.error === null ? upload.message : null}
          cameraAvailable={cameraAvailable ?? false}
          onCareSituation={(value) => edit("careSituation", value)}
        />
      ) : null}

      {step === 2 ? (
        <StepLocation
          value={{
            areaName: draft.areaName,
            locationToken: draft.locationToken,
            usableForDistance: draft.usableForDistance,
            landmark: draft.landmark,
          }}
          onChange={onLocationChange}
        />
      ) : null}

      {step === 3 ? (
        <StepFeatures
          draft={draft}
          loading={analyze.status === "loading"}
          advice={analyze.advice}
          message={analyze.message}
          onEdit={edit}
          onRetake={() => goTo(1)}
        />
      ) : null}

      {step === 4 ? (
        <StepStatus draft={draft} submitError={submitError} onEdit={edit} />
      ) : null}

      <Flex gap="2" marginTop="2">
        {step > 1 ? (
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => goTo((step - 1) as ReportStep)}
          >
            이전
          </Button>
        ) : null}

        {step < TOTAL_STEPS ? (
          <Button
            flex="1"
            colorPalette="brand"
            disabled={
              picker.processing ||
              (step === 1 && !canLeaveStep1) ||
              (step === 2 && !canLeaveStep2)
            }
            onClick={handleNext}
          >
            다음
          </Button>
        ) : (
          <Button
            flex="1"
            colorPalette="brand"
            loading={submitting}
            onClick={handleSubmit}
          >
            제보하기
          </Button>
        )}
      </Flex>
    </Flex>
  );
}
