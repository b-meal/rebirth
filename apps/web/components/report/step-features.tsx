"use client";

import {
  Button,
  Chip,
  FlexBox,
  SectionMessage,
  SegmentedControl,
  SegmentedControlItem,
  Skeleton,
  TextArea,
  Typography,
} from "@wanteddev/wds";

import type { AnalyzeAdviceState } from "../../hooks/use-analyze-photo";
import type { DraftField, ReportDraft } from "../../hooks/use-report-draft";

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
    <FlexBox gap="6px" alignItems="center">
      <Typography variant="headline2" weight="bold">
        {text}
      </Typography>
      {showBadge(field) ? (
        <Chip size="xsmall" variant="outlined" disableInteraction>
          AI 초안
        </Chip>
      ) : null}
    </FlexBox>
  );

  if (loading) {
    return (
      <FlexBox flexDirection="column" gap="16px">
        <Typography variant="title3" weight="bold">
          사진을 정리하고 있습니다
        </Typography>
        {[0, 1, 2, 3].map((row) => (
          <FlexBox key={row} flexDirection="column" gap="8px">
            <Skeleton width="30%" height="20px" />
            <Skeleton width="100%" height="40px" />
          </FlexBox>
        ))}
      </FlexBox>
    );
  }

  return (
    <FlexBox flexDirection="column" gap="20px">
      <Typography variant="title3" weight="bold">
        특징을 확인해 주십시오
      </Typography>

      {advice === "not-animal" ? (
        <SectionMessage variant="cautionary" open>
          {message}
          <FlexBox sx={{ marginTop: "8px" }}>
            <Button size="small" onClick={onRetake}>
              사진 다시 고르기
            </Button>
          </FlexBox>
        </SectionMessage>
      ) : null}
      {advice === "low-quality" || advice === "failed" ? (
        <SectionMessage variant="info" open>
          {message}
        </SectionMessage>
      ) : null}

      <FlexBox flexDirection="column" gap="8px">
        {label("동물 종류", "animalType")}
        <SegmentedControl
          value={draft.animalType}
          onValueChange={(value) =>
            onEdit("animalType", value as ReportDraft["animalType"])
          }
        >
          {ANIMAL_OPTIONS.map((option) => (
            <SegmentedControlItem key={option.value} value={option.value}>
              {option.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </FlexBox>

      <FlexBox flexDirection="column" gap="8px">
        {label("외형 요약", "appearance")}
        <TextArea
          value={draft.appearance}
          maxLength={300}
          minRows={3}
          width="100%"
          placeholder="흰색 소형견, 털이 길고 엉킴"
          onChange={(event) => onEdit("appearance", event.target.value)}
        />
        <Typography variant="caption1">
          품종은 단정하지 않고 추정으로만 적습니다
        </Typography>
      </FlexBox>

      <FlexBox flexDirection="column" gap="8px">
        {label("털색", "colors")}
        <FlexBox gap="6px" flexWrap="wrap">
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
        </FlexBox>
      </FlexBox>

      <FlexBox flexDirection="column" gap="8px">
        {label("크기", "size")}
        <SegmentedControl
          value={draft.size}
          onValueChange={(value) => onEdit("size", value as ReportDraft["size"])}
        >
          {SIZE_OPTIONS.map((option) => (
            <SegmentedControlItem key={option.value} value={option.value}>
              {option.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </FlexBox>

      {(
        [
          ["목줄이나 하네스", "collar"],
          ["눈에 보이는 부상", "injury"],
          ["귀 끝 절단", "earTip"],
        ] as const
      ).map(([text, field]) => (
        <FlexBox key={field} flexDirection="column" gap="8px">
          {label(text, field)}
          <SegmentedControl
            value={toTri(draft[field])}
            onValueChange={(value) => onEdit(field, fromTri(value))}
          >
            {TRISTATE.map((option) => (
              <SegmentedControlItem key={option.value} value={option.value}>
                {option.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </FlexBox>
      ))}
    </FlexBox>
  );
}
