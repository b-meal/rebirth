"use client";

import { Badge, HStack, Text, VStack } from "@seed-design/react";
import { Chip } from "seed-design/ui/chip";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";

import type { DraftField, ReportDraft } from "@/hooks/use-report-draft";
import { Section } from "@/components/ui/screen";

// 초안을 고치는 상세 입력. 바텀시트 안에서만 열림
// confidence 수치는 확정으로 읽히므로 화면에 내지 않음

const ANIMAL_OPTIONS = [
  { value: "dog", label: "개" },
  { value: "cat", label: "고양이" },
  { value: "other", label: "그 외" },
  { value: "unknown", label: "모름" },
] as const;

const SIZE_OPTIONS = [
  { value: "small", label: "소형" },
  { value: "medium", label: "중형" },
  { value: "large", label: "대형" },
  { value: "unknown", label: "모름" },
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

// 상세의 특징 절에 그대로 나오는 값. 관찰한 것만 고르게 두고 의료 판단은 넣지 않음
const CONDITION_OPTIONS = [
  "말랐음",
  "털이 엉킴",
  "다리를 절뚝임",
  "사람을 따름",
  "사람을 피함",
  "새끼로 보임",
  "계속 같은 자리",
] as const;

const TRISTATE = [
  { value: "true", label: "있음" },
  { value: "false", label: "없음" },
  { value: "null", label: "모름" },
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

export type ReportFeatureFormProps = {
  draft: ReportDraft;
  onEdit: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void;
};

export function ReportFeatureForm({ draft, onEdit }: ReportFeatureFormProps) {
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

  return (
    <VStack align="stretch" gap="x6">
      <Section>
        {label("동물 종류", "animalType")}
        <Chip.RadioRoot
          value={draft.animalType}
          onValueChange={(value) => onEdit("animalType", value as ReportDraft["animalType"])}
          aria-label="동물 종류"
        >
          <HStack gap="spacingX.betweenChips" wrap>
            {ANIMAL_OPTIONS.map((option) => (
              <Chip.RadioItem key={option.value} value={option.value}>
                <Chip.Label>{option.label}</Chip.Label>
              </Chip.RadioItem>
            ))}
          </HStack>
        </Chip.RadioRoot>
      </Section>

      <TextField
        label="품종 추정"
        indicator={showBadge("breedGuess") ? "AI 초안" : undefined}
        description="계열 추정으로만 적어요. 모르면 비워 두세요"
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
        <Chip.RadioRoot
          value={draft.size}
          onValueChange={(value) => onEdit("size", value as ReportDraft["size"])}
          aria-label="크기"
        >
          <HStack gap="spacingX.betweenChips" wrap>
            {SIZE_OPTIONS.map((option) => (
              <Chip.RadioItem key={option.value} value={option.value}>
                <Chip.Label>{option.label}</Chip.Label>
              </Chip.RadioItem>
            ))}
          </HStack>
        </Chip.RadioRoot>
      </Section>

      <Section>
        <Text as="h3" textStyle="t5Bold" color="fg.neutral">
          지금 상태
        </Text>
        <HStack gap="spacingX.betweenChips" wrap>
          {CONDITION_OPTIONS.map((tag) => {
            const selected = draft.conditionTags.includes(tag);
            return (
              <Chip.Toggle
                key={tag}
                size="small"
                checked={selected}
                onCheckedChange={() =>
                  onEdit(
                    "conditionTags",
                    selected
                      ? draft.conditionTags.filter((item) => item !== tag)
                      : // 서버 상한이 8개
                        [...draft.conditionTags, tag].slice(0, 8),
                  )
                }
              >
                <Chip.Label>{tag}</Chip.Label>
              </Chip.Toggle>
            );
          })}
        </HStack>
      </Section>

      {TRISTATE_FIELDS.filter(
        // 귀 끝은 고양이만 관찰값을 가짐. 개에 값이 들어가면 저장이 거부됨
        ([, field]) => field !== "earTip" || draft.animalType === "cat",
      ).map(([text, field]) => (
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
