"use client";

import { useEffect } from "react";
import {
  Chip,
  FlexBox,
  SectionMessage,
  TextField,
  Typography,
} from "@wanteddev/wds";

import type { ReportDraft } from "../../hooks/use-report-draft";

// 4단계 상태와 제출. 보호 상황에 따라 마무리 안내가 갈림
// 포획을 유도하거나 응급처치를 안내하지 않음

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

// datetime-local 이 쓰는 형태. 초와 타임존을 떼어냄
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
  // 초안 생성 시점에 넣으면 서버 렌더와 값이 갈림
  useEffect(() => {
    if (draft.occurredAt) return;
    const now = new Date().toISOString();
    const frame = requestAnimationFrame(() => onEdit("occurredAt", now));
    return () => cancelAnimationFrame(frame);
  }, [draft.occurredAt, onEdit]);

  return (
    <FlexBox flexDirection="column" gap="20px">
      <Typography variant="title3" weight="bold">
        상태를 골라 주십시오
      </Typography>

      {submitError ? (
        <SectionMessage variant="negative" open>
          {submitError}
        </SectionMessage>
      ) : null}

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="headline2" weight="bold">
          지금 상태 (복수 선택)
        </Typography>
        <FlexBox gap="6px" flexWrap="wrap">
          {TAG_OPTIONS.map((tag) => {
            const selected = draft.conditionTags.includes(tag);
            return (
              <Chip
                key={tag}
                size="small"
                active={selected}
                onClick={() =>
                  onEdit(
                    "conditionTags",
                    selected
                      ? draft.conditionTags.filter((t) => t !== tag)
                      : // 서버 상한이 8개
                        [...draft.conditionTags, tag].slice(0, 8),
                  )
                }
              >
                {tag}
              </Chip>
            );
          })}
        </FlexBox>
      </FlexBox>

      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="headline2" weight="bold">
          목격 시각
        </Typography>
        <TextField
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
      </FlexBox>

      {/* 보호 상황별 마무리 안내 */}
      {draft.careSituation === "roaming" ? (
        <SectionMessage variant="info" open>
          동물에게 무리하게 다가가지 마십시오. 다치거나 도로 위에 있으면 1577-0954
          또는 관할 지자체에 먼저 신고해 주십시오
        </SectionMessage>
      ) : null}
      {draft.careSituation === "in_care" ? (
        <SectionMessage variant="info" open>
          보호 중인 장소를 안전하게 유지해 주십시오. 인계가 필요하면 1577-0954 또는
          관할 지자체에 문의할 수 있습니다
        </SectionMessage>
      ) : null}
    </FlexBox>
  );
}
