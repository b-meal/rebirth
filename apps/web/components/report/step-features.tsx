"use client";

import { Badge, HStack, Skeleton, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";

import type { AnalyzeAdviceState } from "@/hooks/use-analyze-photo";
import type { DraftField, ReportDraft } from "@/hooks/use-report-draft";
import { Section } from "@/components/ui/screen";

// 3단계 특징, confidence 수치는 확정으로 읽히므로 화면에 내지 않음

const ANIMAL_OPTIONS = [
  { value: "dog", label: "개" },
  { value: "cat", label: "고양이" },
  { value: "other", label: "그 외" },
  { value: "unknown", label: "모르겠음" },
] as const;

const SIZE_OPTIONS = [
  { value: "small", label: "소형" },
  { value: "medium", label: "중형" },
  { value: "large", label: "대형" },
  { value: "unknown", label: "모르겠음" },
] as const;

const COLOR_OPTIONS = [
  "흰색",
  "검정색",
  "갈색",
  "노란색",
  "회색",
  "베이지",
  "얼룩",
  "삼색",
] as const;

const TRISTATE = [
  { value: "true", label: "있음" },
  { value: "false", label: "없음" },
  { value: "null", label: "모르겠음" },
] as const;

const TRISTATE_FIELDS = [
  ["목줄이나 하네스", "collar"],
  ["눈에 보이는 부상", "injury"],
  ["귀 끝 절단", "earTip"],
] as const;

function toTri(value: boolean | null): "true" | "false" | "null" {
  if (value === true) return "true";
  if (value === false) return "false";
  return "null";
}

function fromTri(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export type StepFeaturesProps = {
  draft: ReportDraft;
  loading: boolean;
  advice: AnalyzeAdviceState | null;
  message: string | null;
  onEdit: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void;
  onRetake: () => void;
};

export function StepFeatures({
  draft,
  loading,
  advice,
  message,
  onEdit,
  onRetake,
}: StepFeaturesProps) {
  // 초안이 있고 아직 고치지 않은 필드에만 배지를 붙임
  const showBadge = (field: DraftField) =>
    draft.aiRaw !== null && !draft.editedFields.includes(field);

  const label = (text: string, field: DraftField) => (
    <HStack gap="x1_5" align="center">
      <Text as="h3" textStyle="t5Bold" color="fg.neutral">
        {text}
      </Text>
      {showBadge(field) ? (
        <Badge size="medium" variant="outline" tone="neutral">
          AI 초안
        </Badge>
      ) : null}
    </HStack>
  );

  if (loading) {
    return (
      <VStack align="stretch" gap="x5">
        <Text as="h2" textStyle="t7Bold" color="fg.neutral">
          사진을 정리하고 있어요
        </Text>
        {[0, 1, 2, 3].map((row) => (
          <VStack key={row} align="stretch" gap="x2">
            <Skeleton width="30%" height="x5" radius="8" />
            <Skeleton width="full" height="x10" radius="8" />
          </VStack>
        ))}
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap="x6">
      <Text as="h2" textStyle="t7Bold" color="fg.neutral">
        특징을 확인해 주세요
      </Text>

      {advice === "not-animal" ? (
        <VStack align="stretch" gap="x2">
          <Callout tone="warning" description={message ?? ""} />
          <ActionButton variant="brandSolid" size="small" onClick={onRetake}>
            사진 다시 고르기
          </ActionButton>
        </VStack>
      ) : null}
      {advice === "low-quality" || advice === "failed" ? (
        <Callout tone="informative" description={message ?? ""} />
      ) : null}

      <Section>
        {label("동물 종류", "animalType")}
        <SegmentedControl
          value={draft.animalType}
          onValueChange={(value) => onEdit("animalType", value as ReportDraft["animalType"])}
          aria-label="동물 종류"
        >
          {ANIMAL_OPTIONS.map((option) => (
            <SegmentedControlItem key={option.value} value={option.value}>
              {option.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Section>

      <TextField
        label="품종 추정"
        indicator={showBadge("breedGuess") ? "AI 초안" : undefined}
        description="확정이 아니라 계열 추정으로만 표시됩니다. 모르면 비워 두십시오"
        value={draft.breedGuess}
        maxGraphemeCount={30}
        onValueChange={(next) => onEdit("breedGuess", next.value)}
      >
        <TextFieldInput placeholder="말티즈" />
      </TextField>

      <TextField
        label="외형 요약"
        indicator={showBadge("appearance") ? "AI 초안" : undefined}
        description="품종은 단정하지 않고 추정으로만 적어요"
        value={draft.appearance}
        maxGraphemeCount={300}
        onValueChange={(next) => onEdit("appearance", next.value)}
      >
        <TextFieldTextarea placeholder="흰색 소형견, 털이 길고 엉킴" />
      </TextField>

      <TextField
        label="제보 글"
        indicator={showBadge("story") ? "AI 초안" : undefined}
        description="AI 가 쓴 초안이에요. 사실과 다르면 고쳐 주세요"
        value={draft.story}
        maxGraphemeCount={180}
        onValueChange={(next) => onEdit("story", next.value)}
      >
        <TextFieldTextarea placeholder="화단 근처에 혼자 있었고 사람을 피하지 않음" />
      </TextField>

      <Section>
        {label("털색", "colors")}
        <HStack gap="spacingX.betweenChips" wrap>
          {COLOR_OPTIONS.map((color) => {
            const selected = draft.colors.includes(color);
            return (
              <Chip.Toggle
                key={color}
                size="small"
                checked={selected}
                onCheckedChange={() =>
                  onEdit(
                    "colors",
                    selected
                      ? draft.colors.filter((c) => c !== color)
                      : // 서버 상한이 5개
                        [...draft.colors, color].slice(0, 5),
                  )
                }
              >
                <Chip.Label>{color}</Chip.Label>
              </Chip.Toggle>
            );
          })}
        </HStack>
      </Section>

      <Section>
        {label("크기", "size")}
        <SegmentedControl
          value={draft.size}
          onValueChange={(value) => onEdit("size", value as ReportDraft["size"])}
          aria-label="크기"
        >
          {SIZE_OPTIONS.map((option) => (
            <SegmentedControlItem key={option.value} value={option.value}>
              {option.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Section>

      {TRISTATE_FIELDS.map(([text, field]) => (
        <Section key={field}>
          {label(text, field)}
          <SegmentedControl
            value={toTri(draft[field])}
            onValueChange={(value) => onEdit(field, fromTri(value))}
            aria-label={text}
          >
            {TRISTATE.map((option) => (
              <SegmentedControlItem key={option.value} value={option.value}>
                {option.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Section>
      ))}
    </VStack>
  );
}
