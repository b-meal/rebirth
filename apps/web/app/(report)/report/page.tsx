"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, TopNavigationButton } from "@wanteddev/wds";
import {
  TOTAL_STEPS,
  allowedStep,
  firstIncompleteStep,
  parseStep,
  type ReportStep,
} from "../../../lib/report-draft";
import { ReportDraftProvider, useReportDraft } from "../../../components/report/draft";
import { AppShell } from "../../../components/layout/app-shell";
import {
  StepAppearance,
  StepConfirm,
  StepLocation,
  StepPhoto,
} from "../../../components/report/steps";

const STEP_VIEW: Record<ReportStep, { next: string; render: () => ReactNode }> = {
  1: { next: "다음 · 목격 장소", render: () => <StepPhoto /> },
  2: { next: "다음 · AI 초안", render: () => <StepLocation /> },
  3: { next: "다음 · 공개 내용 확인", render: () => <StepAppearance /> },
  4: { next: "저장", render: () => <StepConfirm /> },
};

function ReportFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { draft, picker, reset, restored } = useReportDraft();

  const requested = parseStep(params.get("step"));
  // 선행 조건을 채우지 못한 단계로는 들어가지 못함
  const limit = firstIncompleteStep(draft, picker.photos.length);
  const step = allowedStep(requested, limit);

  useEffect(() => {
    if (restored && requested !== step) router.replace(`/report?step=${step}`);
  }, [restored, requested, step, router]);

  // 복원 전에는 앞 단계가 잠깐 보이지 않도록 본문을 비움
  if (!restored) return <AppShell title="발견동물 제보">{null}</AppShell>;

  const dirty =
    picker.photos.length > 0 || Boolean(draft.careSituation) || Boolean(draft.area);

  const goTo = (target: number) => router.push(`/report?step=${target}`);

  const handleBack = () => {
    if (step > 1) goTo(step - 1);
    else router.push("/");
  };

  const handleClose = () => {
    // ponytail: 네이티브 confirm, 디자인 확정되면 wds Alert 로 교체
    if (dirty && !window.confirm("작성 중인 내용이 사라집니다. 그만두시겠어요?")) return;
    reset();
    router.push("/");
  };

  return (
    <AppShell
      title={`발견동물 제보 · ${step}/${TOTAL_STEPS}`}
      leading={
        <TopNavigationButton variant="text" color="assistive" onClick={handleBack}>
          뒤로
        </TopNavigationButton>
      }
      trailing={
        <TopNavigationButton variant="text" color="assistive" onClick={handleClose}>
          닫기
        </TopNavigationButton>
      }
      action={
        <Button
          size="large"
          fullWidth
          disabled={step === TOTAL_STEPS || limit <= step}
          onClick={() => goTo(step + 1)}
        >
          {STEP_VIEW[step].next}
        </Button>
      }
    >
      {STEP_VIEW[step].render()}
    </AppShell>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportDraftProvider>
        <ReportFlow />
      </ReportDraftProvider>
    </Suspense>
  );
}
