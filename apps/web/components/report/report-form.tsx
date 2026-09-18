"use client";

import { reportClientError } from "@/lib/report-error";
import { CARE_INPUT_LABEL, CONSENT_DOCUMENT_VERSION, type CareSituation } from "@rebirth/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
} from "seed-design/ui/bottom-sheet";
import { ActionableCallout, Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from "seed-design/ui/alert-dialog";

import type { AnalyzeAdviceState } from "@/hooks/use-analyze-photo";
import { useCameraAvailable } from "@/hooks/use-camera-available";
import { usePhotoPicker } from "@/hooks/use-photo-picker";
import { usePhotoPrecheck } from "@/hooks/use-photo-precheck";
import {
  useReportPipeline,
  type ReportPipelinePhase,
} from "@/hooks/use-report-pipeline";
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

// 서버가 문구를 못 내려줬을 때만 쓰는 대비값. 평소에는 guidance 의 문구가 그대로 옴
const NOT_ANIMAL_FALLBACK = "동물이 보이지 않아요. 동물이 담긴 사진으로 다시 찍어 주세요";
const ANALYZE_FAILED_FALLBACK = "잠시 후 다시 시도해 주세요";

const STEP_LABEL: Record<ReportStep, string> = {
  1: "사진",
  2: "제보 등록",
};

// 실종 신고에만 쓰는 unknown 은 제보 폼에 내놓지 않음
// 문구는 저장 뒤 배지와 끝말이 같아야 해 카탈로그에서 가져옴
const CARE_OPTIONS = (Object.keys(CARE_INPUT_LABEL) as Exclude<CareSituation, "unknown">[]).map(
  (value) => ({ value, label: CARE_INPUT_LABEL[value] }),
);

// 카드가 읽을 권고. 되돌린 갈래도 2단계로 다시 오면 그대로 보임
function adviceOf(phase: ReportPipelinePhase): AnalyzeAdviceState | null {
  if (phase.name === "ready") return phase.advice;
  if (phase.name === "rejected") return "not-animal";
  if (phase.name === "failed") return "failed";
  return null;
}

function messageOf(phase: ReportPipelinePhase): string | null {
  if (phase.name === "ready" || phase.name === "rejected" || phase.name === "failed") {
    return phase.message;
  }
  return null;
}

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
  const cameraAvailable = useCameraAvailable();
  // 초안을 고칠 때만 여는 상세 입력
  const [formOpen, setFormOpen] = useState(false);
  // 1단계로 되돌린 이유를 알리는 알럿. null 이면 닫힘
  // retry 는 닫을 때 분석을 초기화할지. 실패는 같은 사진으로 다시 해 볼 수 있고 비동물은 아님
  const [block, setBlock] = useState<{
    title: string;
    description: string;
    retry: boolean;
  } | null>(null);

  const { draft, photos, setPhotos, applyAiDraft, edit, reset } = useReportDraft();
  // 되돌리기는 goTo 가 만들어진 뒤에야 쓸 수 있어 참조로 받아 둠
  const bounceRef = useRef<(next: NonNullable<typeof block>) => void>(() => {});

  // 사진 없는 2단계는 올릴 것도 분석할 것도 없어 아무것도 끝나지 않는 막다른 화면
  // popstate 가 그 단계를 만들지 않지만 그리는 자리에서도 막아 다른 길이 생겨도 되살아나지 않게 함
  // 이펙트로 되돌리면 그 한 프레임이 먼저 그려지고 걸음이 하나 더 쌓임
  const view: ReportStep = step === 2 && photos.length > 0 ? 2 : 1;

  const onRejected = useCallback((message: string | null) => {
    bounceRef.current({
      title: "다시 찍어 주세요",
      description: message ?? NOT_ANIMAL_FALLBACK,
      retry: false,
    });
  }, []);
  // 초안 없이 등록하면 사진과 글이 따로 놀아 분석이 끝나기 전에는 저장을 막음
  const onFailed = useCallback((message: string | null) => {
    bounceRef.current({
      title: "분석에 실패했어요",
      description: message ?? ANALYZE_FAILED_FALLBACK,
      retry: true,
    });
  }, []);

  // 사진을 올려 참조를 받고 그 참조로 초안을 받는 한 줄기. 화면은 지금 어느 갈래인지만 봄
  const pipeline = useReportPipeline(photos, { active: view === 2, onRejected, onFailed });
  const { phase } = pipeline;

  // 저장 요청 하나를 가리키는 키, 이중 탭과 재시도가 제보를 두 건 만들지 않음
  const idempotencyKey = useRef<string | null>(null);

  const { reset: resetPipeline } = pipeline;
  const picker = usePhotoPicker({
    maxCount: MAX_PHOTOS,
    onChange: (next) => {
      setPhotos(next);
      // 사진이 바뀌면 이전 분석과 업로드 결과를 쓰지 않음
      resetPipeline();
    },
  });

  // 1단계에서 고르는 즉시 동물 유무만 물어봄. 2단계로 넘어가도 결과가 남게 여기에 둠
  const precheck = usePhotoPrecheck(photos);

  useEffect(() => {
    // 사진은 File 이라 복원되지 않으므로 새로고침은 늘 1단계에서 다시 시작함
    const url = new URL(window.location.href);
    if (url.searchParams.has("step")) {
      url.searchParams.delete("step");
      window.history.replaceState({ step: 1 }, "", url);
    }
  }, []);

  // popstate 는 그 순간의 사진을 봐야 해 최신 목록을 참조로 들고 있음
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // 뒤로가기로 단계가 하나 되돌아가게 함
  useEffect(() => {
    const onPop = () => {
      const next = readStepFromUrl();
      // 사진을 지운 뒤 앞으로가기로 돌아온 2단계. 주소까지 1단계로 맞춰
      // 다음 사진을 고르는 순간 확인 화면을 건너뛰지 않게 함
      if (next === 2 && photosRef.current.length === 0) {
        const url = new URL(window.location.href);
        url.searchParams.set("step", "1");
        window.history.replaceState({ step: 1 }, "", url);
        setStep(1);
        return;
      }
      setStep(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 되돌림은 새 걸음이 아니라 걸음 취소라 replace 로 씀
  // push 로 쌓으면 되돌린 자리 바로 뒤에 갈 수 없는 단계가 남아 뒤로가기가 그리로 감
  const goTo = useCallback((next: ReportStep, replace = false) => {
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    const state = { step: next };
    if (replace) window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
    window.scrollTo({ top: 0 });
  }, []);

  // 분석 결과가 오면 초안을 채움, 사용자가 이미 고친 필드는 덮지 않음
  useEffect(() => {
    if (phase.name !== "ready") return;
    applyAiDraft(phase.draft, phase.model ?? "", phase.analyzedAt ?? "");
  }, [phase, applyAiDraft]);

  const onLocationChange = useCallback(
    (next: Partial<LocationValue>) => {
      for (const [key, value] of Object.entries(next)) {
        edit(key as keyof ReportDraft, value as ReportDraft[keyof ReportDraft]);
      }
    },
    [edit],
  );

  // 동물이 없으면 2단계에서 할 일이 없어 사진 고르는 화면으로 되돌림
  // 두 장을 한 요청으로 분석해 어느 쪽이 문제인지 알 수 없으므로 지우는 것은 사람이 고름
  // 사진은 그대로 두고 칸마다 있는 삭제 단추로 뺄 수 있게 함
  const bounce = useCallback(
    (next: NonNullable<typeof block>) => {
      goTo(1, true);
      // 화면이 되돌아간 이유를 반드시 읽고 넘어가야 해 스스로 사라지는 스낵바 대신 알럿을 씀
      setBlock(next);
    },
    [goTo],
  );
  // 분석 결과가 오는 순간 훅이 부름. 이펙트에서 화면을 옮기면 렌더가 한 번 더 도는 것을 린트가 막음
  useEffect(() => {
    bounceRef.current = bounce;
  }, [bounce]);

  // ready 갈래만이 참조와 초안을 함께 들고 있음
  // 비동물, 분석 실패, 초안 전 이라는 세 조건을 따로 맞추지 않아도 갈래 하나로 갈림
  const pending = phase.name === "uploading" || phase.name === "analyzing";
  const canSubmit =
    phase.name === "ready" && draft.locationToken !== null && draft.careSituation !== null;

  // ready 밖에서는 보낼 참조가 없어 갈래를 먼저 확인함
  const handleSubmit = useCallback(async () => {
    if (phase.name !== "ready" || !draft.locationToken) return;
    const { uploadIds } = phase;
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
        fieldErrors?: Record<string, string>;
      };

      // 앞선 요청이 아직 처리 중, 키를 유지한 채 다시 누르게 함
      if (response.status === 202 || result.pending) {
        setSubmitError("저장하고 있어요. 잠시 후 다시 눌러 주세요");
        setSubmitting(false);
        return;
      }

      if (!response.ok || !result.id) {
        // 입력값은 그대로 두고 재시도만 노출
        // 어느 칸이 문제인지는 필드별 메시지가 알고 있어 그것을 먼저 보여 줌
        // 되돌릴 걸음은 두지 않음. 오류 줄이 두 번째 걸음에만 있어 옮기면 메시지가 사라짐
        const message = Object.values(result.fieldErrors ?? {})[0];
        setSubmitError(message ?? result.message ?? "제보가 저장되지 않았어요. 다시 시도해 주세요");
        setSubmitting(false);
        return;
      }

      reset();
      // 뒤로가기로 폼에 돌아가지 않게 push 가 아니라 replace 로 완료 화면에 들어감
      router.replace(`/r/${result.id}/done`);
    } catch (error) {
      reportClientError("report.submit", error);
      setSubmitError("제보가 저장되지 않았어요. 입력한 내용은 그대로 있어요");
      setSubmitting(false);
    }
  }, [phase, draft, reset, router]);

  const cardAdvice = adviceOf(phase);
  const cardMessage = messageOf(phase);

  return (
    <Screen>
      <AppHeader title="제보하기" />
      {view === 1 ? (
        <ReportCapture
          picker={picker}
          precheck={precheck}
          cameraAvailable={cameraAvailable}
          step={view}
          total={TOTAL_STEPS}
          label={STEP_LABEL[view]}
          onNext={() => goTo(2)}
        />
      ) : (
        <>
          <ReportPhotoHero
            photos={photos}
            step={view}
            total={TOTAL_STEPS}
            label={STEP_LABEL[view]}
            onRetake={() => goTo(1)}
          />

          <ScreenBody gap="x4" pt="x4" pb="x4">
            {phase.name === "uploading" ? (
              <Text textStyle="t3Regular" color="fg.neutralMuted">
                사진을 올리고 있어요
              </Text>
            ) : null}

            {/* 올리다 멈추면 참조가 모자라 등록이 막히므로 그 자리에서 다시 올릴 길을 둠 */}
            {phase.name === "uploadFailed" ? (
              <ActionableCallout
                tone="critical"
                title={phase.message}
                description="눌러서 다시 올리기"
                onClick={pipeline.retryUpload}
              />
            ) : null}

            <ReportDraftCard
              draft={draft}
              loading={pending}
              advice={cardAdvice}
              message={cardMessage}
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
              sessionReady={pipeline.sessionReady}
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
              loading={submitting || pending}
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

      {/* 사진을 비우고 1단계로 되돌린 이유를 알림. 확인 말고 고를 것이 없어 버튼 하나만 둠 */}
      <AlertDialogRoot
        open={block !== null}
        onOpenChange={(open) => {
          if (open) return;
          // 실패는 같은 사진으로 다시 해 볼 수 있어 분석만 비워 다음 을 누르면 재시도가 돎
          if (block?.retry) pipeline.clearAnalysis();
          setBlock(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{block?.title ?? ""}</AlertDialogTitle>
            <AlertDialogDescription>{block?.description ?? ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                if (block?.retry) pipeline.clearAnalysis();
                setBlock(null);
              }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </Screen>
  );
}
