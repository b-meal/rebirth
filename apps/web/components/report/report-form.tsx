"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, FlexBox, ProgressIndicator, Typography } from "@wanteddev/wds";

import { useAnalyzePhoto } from "../../hooks/use-analyze-photo";
import { usePhotoPicker } from "../../hooks/use-photo-picker";
import {
  useReportDraft,
  type ReportDraft,
  type ReportStep,
} from "../../hooks/use-report-draft";
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

  const picker = usePhotoPicker({
    maxCount: 1,
    onChange: (photos) => setPhoto(photos[0] ?? null),
  });

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const fromUrl = readStepFromUrl();
    // 하이드레이션 직후 값이라 렌더 연쇄를 피해 마이크로태스크로 미룸
    queueMicrotask(() => {
      setCameraAvailable(isMobile);
      setStep(fromUrl);
    });
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

  const handleFiles = useCallback(
    async (files: File[]) => {
      await picker.replaceFiles(files);
      analyze.clear();
    },
    [picker, analyze],
  );

  const onLocationChange = useCallback(
    (next: Partial<LocationValue>) => {
      for (const [key, value] of Object.entries(next)) {
        edit(key as keyof ReportDraft, value as ReportDraft[keyof ReportDraft]);
      }
    },
    [edit],
  );

  const canLeaveStep1 = photo !== null && draft.careSituation !== null;
  const canLeaveStep2 = draft.areaName !== null;

  const handleNext = useCallback(() => {
    if (step === 1) {
      // 사진과 보호 상황이 모두 채워지면 분석을 백그라운드로 시작
      if (photo && analyze.status === "idle") analyze.start(photo.file);
      goTo(2);
      return;
    }
    if (step < TOTAL_STEPS) goTo((step + 1) as ReportStep);
  }, [step, photo, analyze, goTo]);

  const handleSubmit = useCallback(async () => {
    if (!photo) return;
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      kind: "sighting" as const,
      careSituation: draft.careSituation,
      animalType: draft.animalType,
      appearance: [draft.appearance, draft.landmark && `단서: ${draft.landmark}`]
        .filter(Boolean)
        .join("\n"),
      colors: draft.colors,
      size: draft.size,
      conditionTags: draft.conditionTags,
      collar: draft.collar,
      injury: draft.injury,
      earTip: draft.earTip,
      ...(draft.coordinates ? { coordinates: draft.coordinates } : {}),
      ...(draft.areaCode ? { areaCode: draft.areaCode } : {}),
      ...(draft.areaName ? { areaName: draft.areaName } : {}),
      // 4단계에서 채우지만 비어 있으면 제출 시각으로 둠
      occurredAt: draft.occurredAt || new Date().toISOString(),
      aiEditedFields: draft.editedFields,
      ...(draft.aiRaw ? { aiRaw: draft.aiRaw } : {}),
      ...(draft.aiModel ? { aiModel: draft.aiModel } : {}),
      ...(draft.aiAnalyzedAt ? { aiAnalyzedAt: draft.aiAnalyzedAt } : {}),
    };

    const body = new FormData();
    body.append("photo", photo.file);
    body.append("payload", JSON.stringify(payload));

    try {
      const response = await fetch("/api/reports", { method: "POST", body });
      const result = (await response.json()) as { id?: string; message?: string };

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
  }, [photo, draft, reset, router]);

  return (
    <FlexBox flexDirection="column" gap="20px" sx={{ padding: "20px 16px 96px" }}>
      <FlexBox flexDirection="column" gap="8px">
        <ProgressIndicator percent={(step / TOTAL_STEPS) * 100} />
        <Typography variant="caption1">
          {step} / {TOTAL_STEPS} · {STEP_LABEL[step]}
        </Typography>
      </FlexBox>

      {step === 1 ? (
        <StepPhoto
          photo={photo}
          careSituation={draft.careSituation}
          processing={picker.processing}
          error={picker.error}
          cameraAvailable={cameraAvailable ?? false}
          onFiles={handleFiles}
          onCareSituation={(value) => edit("careSituation", value)}
          onClearError={picker.dismissError}
        />
      ) : null}

      {step === 2 ? (
        <StepLocation
          value={{
            areaName: draft.areaName,
            areaCode: draft.areaCode,
            coordinates: draft.coordinates,
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

      <FlexBox gap="8px" sx={{ marginTop: "8px" }}>
        {step > 1 ? (
          <Button
            variant="outlined"
            disabled={submitting}
            onClick={() => goTo((step - 1) as ReportStep)}
          >
            이전
          </Button>
        ) : null}

        {step < TOTAL_STEPS ? (
          <Button
            fullWidth
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
          <Button fullWidth loading={submitting} onClick={handleSubmit}>
            제보하기
          </Button>
        )}
      </FlexBox>
    </FlexBox>
  );
}
