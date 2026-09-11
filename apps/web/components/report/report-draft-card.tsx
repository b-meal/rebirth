"use client";

import { Flex, HStack, Icon, Skeleton, Text, VStack } from "@seed-design/react";
import { IconPencilLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

import type { AnalyzeAdviceState } from "@/hooks/use-analyze-photo";
import type { ReportDraft } from "@/hooks/use-report-draft";
import { ANIMAL_LABEL, SIZE_LABEL, breedLabel } from "@/lib/report-label";
import { Badge, type BadgeTone } from "@/components/ui/badge";

// AI 가 읽은 것을 읽기 카드 하나로 묶는 자리. 고칠 때만 상세 입력을 엶
// 사용자가 이 화면에서 직접 고르는 것은 보호 상황 하나뿐이라는 전제

type SummaryTag = { label: string; tone: BadgeTone };

/** 카드에 접어 보여줄 뱃지. 값이 없는 항목은 줄에서 빠짐 */
function summaryTags(draft: ReportDraft): SummaryTag[] {
  const labels = [
    ANIMAL_LABEL[draft.animalType] ?? "",
    SIZE_LABEL[draft.size] ?? "",
    ...draft.colors,
    breedLabel(draft.breedGuess.trim() || null) ?? "",
    draft.collar === true ? "목줄 있음" : draft.collar === false ? "목줄 없음" : "",
    ...draft.conditionTags,
  ].filter(Boolean);

  const tags: SummaryTag[] = labels.map((label) => ({ label, tone: "neutral" }));
  // 부상은 읽는 사람이 먼저 봐야 하는 값이라 색을 달리 줌
  if (draft.injury === true) tags.push({ label: "다친 것으로 보임", tone: "critical" });
  return tags;
}

export type ReportDraftCardProps = {
  draft: ReportDraft;
  loading: boolean;
  advice: AnalyzeAdviceState | null;
  message: string | null;
  onEdit: () => void;
  onRetake: () => void;
};

export function ReportDraftCard({
  draft,
  loading,
  advice,
  message,
  onEdit,
  onRetake,
}: ReportDraftCardProps) {
  if (loading) {
    return (
      <VStack align="stretch" gap="x3" p="x4" borderRadius="r3" bg="bg.layerFloating">
        <Text textStyle="t3Bold" color="fg.brand">
          사진을 정리하고 있어요
        </Text>
        <Skeleton width="80%" height="x6" radius="8" />
        <Skeleton width="full" height="x10" radius="8" />
        <Skeleton width="60%" height="x6" radius="8" />
      </VStack>
    );
  }

  // 동물이 안 보이면 초안을 읽힐 이유가 없어 카드 대신 재촬영만 내놓음
  if (advice === "not-animal") {
    return (
      <VStack align="stretch" gap="x3">
        <Callout tone="warning" description={message ?? ""} />
        <ActionButton variant="brandSolid" size="medium" onClick={onRetake}>
          사진 다시 찍기
        </ActionButton>
      </VStack>
    );
  }

  const tags = summaryTags(draft);

  return (
    <VStack align="stretch" gap="x3" p="x4" borderRadius="r3" bg="bg.layerFloating">
      <HStack gap="x1_5" align="center">
        <Text textStyle="t3Bold" color="fg.brand">
          AI 초안
        </Text>
        <Text textStyle="t2Regular" color="fg.neutralSubtle">
          사진에서 읽은 내용
        </Text>
      </HStack>

      {advice === "low-quality" || advice === "failed" ? (
        <Callout tone="informative" description={message ?? ""} />
      ) : null}

      <Text textStyle="t6Bold" color="fg.neutral">
        {draft.appearance || "외형 설명을 적어 주세요"}
      </Text>

      {draft.story ? (
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          {draft.story}
        </Text>
      ) : null}

      {tags.length > 0 ? (
        <Flex wrap="wrap" gap="x1_5">
          {tags.map((tag) => (
            <Badge key={tag.label} label={tag.label} tone={tag.tone} />
          ))}
        </Flex>
      ) : null}

      <HStack justify="flex-end">
        <ActionButton variant="neutralOutline" size="small" onClick={onEdit}>
          <Icon svg={<IconPencilLine />} />
          고치기
        </ActionButton>
      </HStack>
    </VStack>
  );
}
