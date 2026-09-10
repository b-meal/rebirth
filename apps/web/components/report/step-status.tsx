"use client";

import { useEffect } from "react";
import { HStack, Text, VStack } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";
import { Chip } from "seed-design/ui/chip";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import type { ReportDraft } from "@/hooks/use-report-draft";
import { Section } from "@/components/ui/screen";

// 4단계 상태와 제출, 포획 유도나 응급처치 안내는 넣지 않음

const TAG_OPTIONS = [
  "배회 중",
  "한곳에 머묾",
  "사람을 피함",
  "사람에게 다가옴",
  "절뚝이며 걸음",
  "차도 근처",
  "밤에 발견",
  "어린 개체로 보임",
] as const;

// datetime-local 이 쓰는 형태, 초와 타임존을 떼어냄
function toLocalInput(iso: string): string {
  const date = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type StepStatusProps = {
  draft: ReportDraft;
  submitError: string | null;
  onEdit: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void;
};

export function StepStatus({ draft, submitError, onEdit }: StepStatusProps) {
  // 목격 시각 기본값은 이 단계에 처음 왔을 때의 현재 시각
  useEffect(() => {
    if (draft.occurredAt) return;
    const now = new Date().toISOString();
    const frame = requestAnimationFrame(() => onEdit("occurredAt", now));
    return () => cancelAnimationFrame(frame);
  }, [draft.occurredAt, onEdit]);

  return (
    <VStack align="stretch" gap="x6">
      <Text as="h2" textStyle="t7Bold" color="fg.neutral">
        상태를 골라 주십시오
      </Text>

      {submitError ? <Callout tone="critical" description={submitError} /> : null}

      <Section>
        <Text as="h3" textStyle="t5Bold" color="fg.neutral">
          지금 상태
        </Text>
        <HStack gap="spacingX.betweenChips" wrap>
          {TAG_OPTIONS.map((tag) => {
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
                      ? draft.conditionTags.filter((t) => t !== tag)
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

      <TextField label="목격 시각">
        <TextFieldInput
          type="datetime-local"
          value={toLocalInput(draft.occurredAt)}
          max={toLocalInput(new Date().toISOString())}
          onChange={(event) => {
            const next = new Date(event.target.value);
            if (!Number.isNaN(next.getTime())) {
              onEdit("occurredAt", next.toISOString());
            }
          }}
        />
      </TextField>

      {draft.careSituation === "roaming" ? (
        <Callout
          tone="informative"
          description="동물에게 무리하게 다가가지 마십시오. 다치거나 도로 위에 있으면 1577-0954 또는 관할 지자체에 먼저 신고해 주십시오"
        />
      ) : null}
      {draft.careSituation === "in_care" ? (
        <Callout
          tone="informative"
          description="보호 중인 장소를 안전하게 유지해 주십시오. 인계가 필요하면 1577-0954 또는 관할 지자체에 문의할 수 있습니다"
        />
      ) : null}
    </VStack>
  );
}
