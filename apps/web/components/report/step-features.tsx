"use client";

import { Button, Flex, Heading, Skeleton, Textarea } from "@chakra-ui/react";

import type { AnalyzeAdviceState } from "@/hooks/use-analyze-photo";
import type { DraftField, ReportDraft } from "@/hooks/use-report-draft";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { SectionMessage } from "@/components/ui/section-message";
import { Segmented } from "@/components/ui/segmented";

// 3단계 특징. AI 초안을 채우고 사용자가 틀린 항목만 고침
// confidence 수치를 화면에 노출하지 않음. 확률을 보여주면 확정으로 읽힘

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
    <Flex gap="1.5" align="center">
      <Heading size="sm">{text}</Heading>
      {showBadge(field) ? (
        <Chip size="xsmall" outlined readOnly>
          AI 초안
        </Chip>
      ) : null}
    </Flex>
  );

  if (loading) {
    return (
      <Flex direction="column" gap="4">
        <Heading size="lg">사진을 정리하고 있습니다</Heading>
        {[0, 1, 2, 3].map((row) => (
          <Flex key={row} direction="column" gap="2">
            <Skeleton width="30%" height="20px" />
            <Skeleton width="100%" height="40px" />
          </Flex>
        ))}
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="5">
      <Heading size="lg">특징을 확인해 주십시오</Heading>

      {advice === "not-animal" ? (
        <SectionMessage variant="cautionary">
          {message}
          <Flex marginTop="2">
            <Button size="sm" colorPalette="brand" onClick={onRetake}>
              사진 다시 고르기
            </Button>
          </Flex>
        </SectionMessage>
      ) : null}
      {advice === "low-quality" || advice === "failed" ? (
        <SectionMessage variant="info">{message}</SectionMessage>
      ) : null}

      <Flex direction="column" gap="2">
        {label("동물 종류", "animalType")}
        <Segmented
          value={draft.animalType}
          options={ANIMAL_OPTIONS}
          onValueChange={(value) =>
            onEdit("animalType", value as ReportDraft["animalType"])
          }
        />
      </Flex>

      <Field
        label="외형 요약"
        labelSuffix={
          showBadge("appearance") ? (
            <Chip size="xsmall" outlined readOnly>
              AI 초안
            </Chip>
          ) : null
        }
        helper="품종은 단정하지 않고 추정으로만 적습니다"
      >
        <Textarea
          value={draft.appearance}
          maxLength={300}
          rows={3}
          width="100%"
          placeholder="흰색 소형견, 털이 길고 엉킴"
          onChange={(event) => onEdit("appearance", event.target.value)}
        />
      </Field>

      <Flex direction="column" gap="2">
        {label("털색", "colors")}
        <Flex gap="1.5" wrap="wrap">
          {COLOR_OPTIONS.map((color) => {
            const selected = draft.colors.includes(color);
            return (
              <Chip
                key={color}
                size="small"
                active={selected}
                onClick={() =>
                  onEdit(
                    "colors",
                    selected
                      ? draft.colors.filter((c) => c !== color)
                      : // 서버 상한이 5개
                        [...draft.colors, color].slice(0, 5),
                  )
                }
              >
                {color}
              </Chip>
            );
          })}
        </Flex>
      </Flex>

      <Flex direction="column" gap="2">
        {label("크기", "size")}
        <Segmented
          value={draft.size}
          options={SIZE_OPTIONS}
          onValueChange={(value) => onEdit("size", value as ReportDraft["size"])}
        />
      </Flex>

      {(
        [
          ["목줄이나 하네스", "collar"],
          ["눈에 보이는 부상", "injury"],
          ["귀 끝 절단", "earTip"],
        ] as const
      ).map(([text, field]) => (
        <Flex key={field} direction="column" gap="2">
          {label(text, field)}
          <Segmented
            value={toTri(draft[field])}
            options={TRISTATE}
            onValueChange={(value) => onEdit(field, fromTri(value))}
          />
        </Flex>
      ))}
    </Flex>
  );
}
