"use client";

import { FlexBox, Typography, useTheme } from "@wanteddev/wds";

// 운영 화면 차트 조각. 라이브러리를 들이지 않고 div 와 SVG 로만 그림
// 모노크롬이 기본이고 유채색은 상태 신호와 강조 한 곳에만 씀
// 한 차트는 한 계열만 그림. 두 계열을 겹치면 무엇을 읽는 차트인지 흐려짐

export type ChartTone = "neutral" | "negative" | "accent";

function useTone(tone: ChartTone): string {
  const theme = useTheme();
  if (tone === "negative") return theme.semantic.status.negative;
  if (tone === "accent") return theme.semantic.primary.normal;
  return theme.semantic.label.normal;
}

function useTrack(): string {
  return useTheme().semantic.fill.normal;
}

/** 큰 숫자 하나. 차트가 필요 없는 값은 여기서 끝냄 */
export function Metric({
  label,
  value,
  unit,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: ChartTone;
}) {
  const color = useTone(tone);

  return (
    <FlexBox flexDirection="column" gap="2px" sx={{ minWidth: 0 }}>
      <Typography variant="caption1" color="semantic.label.alternative">
        {label}
      </Typography>
      <FlexBox alignItems="baseline" gap="2px">
        <Typography
          variant="title3"
          weight="bold"
          sx={{ color, fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Typography>
        {unit ? (
          <Typography variant="label2" color="semantic.label.alternative">
            {unit}
          </Typography>
        ) : null}
      </FlexBox>
      {note ? (
        <Typography variant="caption2" color="semantic.label.assistive">
          {note}
        </Typography>
      ) : null}
    </FlexBox>
  );
}

/** 달성과 상한이 함께 있는 값. 배점처럼 최댓값이 정해진 축에만 씀 */
export function TrackBar({
  label,
  value,
  max,
  valueText,
  tone = "neutral",
}: {
  label: string;
  value: number;
  max: number;
  valueText?: string;
  tone?: ChartTone;
}) {
  const color = useTone(tone);
  const track = useTrack();
  const ratio = max <= 0 ? 0 : Math.min(1, value / max);

  return (
    <FlexBox flexDirection="column" gap="4px">
      <FlexBox justifyContent="space-between" alignItems="baseline" gap="8px">
        <Typography variant="label2">{label}</Typography>
        <Typography
          variant="label2"
          color="semantic.label.alternative"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {valueText ?? `${value} / ${max}`}
        </Typography>
      </FlexBox>
      <FlexBox
        sx={{ height: "8px", borderRadius: "2px", background: track, overflow: "hidden" }}
      >
        <FlexBox
          sx={{
            width: `${ratio * 100}%`,
            background: color,
            borderRadius: "2px",
            transition: "width .4s",
          }}
        />
      </FlexBox>
    </FlexBox>
  );
}

/** 같은 뜻의 값이 여러 줄일 때. 가장 큰 값을 기준으로 길이를 맞춤 */
export function BarList({
  rows,
  tone = "neutral",
  emptyText = "값이 없습니다",
}: {
  rows: { label: string; value: number; note?: string }[];
  tone?: ChartTone;
  emptyText?: string;
}) {
  const color = useTone(tone);
  const track = useTrack();
  const max = Math.max(1, ...rows.map((row) => row.value));

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="semantic.label.alternative">
        {emptyText}
      </Typography>
    );
  }

  return (
    <FlexBox flexDirection="column" gap="6px">
      {rows.map((row) => (
        <FlexBox key={row.label} alignItems="center" gap="8px">
          <Typography
            variant="caption1"
            color="semantic.label.alternative"
            sx={{ width: "88px", flexShrink: 0, textAlign: "right" }}
          >
            {row.label}
          </Typography>
          <FlexBox
            sx={{
              flex: 1,
              height: "8px",
              borderRadius: "2px",
              background: track,
              overflow: "hidden",
            }}
          >
            <FlexBox
              sx={{
                width: `${(row.value / max) * 100}%`,
                background: color,
                borderRadius: "2px",
              }}
            />
          </FlexBox>
          <Typography
            variant="caption1"
            sx={{ width: "56px", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
          >
            {row.note ?? row.value.toLocaleString()}
          </Typography>
        </FlexBox>
      ))}
    </FlexBox>
  );
}

/** 날짜별 한 계열. 값이 0 인 날도 자리를 지켜 빈 구간이 보이게 함 */
export function DayBars({
  rows,
  tone = "neutral",
  emptyText = "기록이 없습니다",
}: {
  rows: { day: string; value: number }[];
  tone?: ChartTone;
  emptyText?: string;
}) {
  const color = useTone(tone);
  const track = useTrack();
  const max = Math.max(1, ...rows.map((row) => row.value));

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="semantic.label.alternative">
        {emptyText}
      </Typography>
    );
  }

  return (
    <FlexBox flexDirection="column" gap="6px">
      <FlexBox alignItems="flex-end" gap="3px" sx={{ height: "72px" }}>
        {rows.map((row) => (
          <FlexBox
            key={row.day}
            flexDirection="column"
            justifyContent="flex-end"
            sx={{ flex: 1, height: "100%" }}
            title={`${row.day} ${row.value.toLocaleString()}건`}
          >
            <FlexBox
              sx={{
                height: `${Math.max(row.value === 0 ? 1 : 6, (row.value / max) * 100)}%`,
                background: row.value === 0 ? track : color,
                borderRadius: "2px",
              }}
            />
          </FlexBox>
        ))}
      </FlexBox>
      <FlexBox justifyContent="space-between">
        <Typography variant="caption2" color="semantic.label.assistive">
          {rows[0]?.day.slice(5)}
        </Typography>
        <Typography variant="caption2" color="semantic.label.assistive">
          최대 {max.toLocaleString()} · {rows[rows.length - 1]?.day.slice(5)}
        </Typography>
      </FlexBox>
    </FlexBox>
  );
}

/**
 * 비율 하나. 값 자체가 메시지라 막대를 두지 않음
 * 100% 막대는 카드를 가로지르는 검은 띠가 되어 구분선처럼 읽힘
 */
export function Ratio({
  value,
  total,
  label,
  tone = "neutral",
}: {
  value: number;
  total: number;
  label: string;
  tone?: ChartTone;
}) {
  const color = useTone(tone);
  const ratio = total <= 0 ? 0 : value / total;

  return (
    <FlexBox alignItems="baseline" gap="6px">
      <Typography
        variant="display3"
        weight="bold"
        sx={{ color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
      >
        {total <= 0 ? "-" : `${Math.round(ratio * 1000) / 10}%`}
      </Typography>
      <Typography variant="caption1" color="semantic.label.alternative">
        {label}
      </Typography>
    </FlexBox>
  );
}

/** 비율이 아닌 수 하나가 카드의 머리일 때 */
export function Hero({
  value,
  unit,
  label,
  tone = "neutral",
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: ChartTone;
}) {
  const color = useTone(tone);

  return (
    <FlexBox alignItems="baseline" gap="6px">
      <Typography
        variant="display3"
        weight="bold"
        sx={{ color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
      >
        {value}
      </Typography>
      {unit ? (
        <Typography variant="label1" color="semantic.label.alternative">
          {unit}
        </Typography>
      ) : null}
      <Typography variant="caption1" color="semantic.label.alternative">
        {label}
      </Typography>
    </FlexBox>
  );
}

/** 카드 한 장. 하드코딩한 그림자 없이 헤어라인으로만 면을 나눔 */
export function Panel({
  title,
  note,
  children,
  span = 1,
}: {
  title?: string;
  note?: string;
  children: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <FlexBox
      flexDirection="column"
      gap="12px"
      sx={{
        gridColumn: `span ${span}`,
        minWidth: 0,
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "semantic.line.normal.neutral",
        background: "semantic.background.normal.normal",
      }}
    >
      {title ? (
        <FlexBox flexDirection="column" gap="2px">
          <Typography variant="label1" weight="bold">
            {title}
          </Typography>
          {note ? (
            <Typography variant="caption1" color="semantic.label.alternative">
              {note}
            </Typography>
          ) : null}
        </FlexBox>
      ) : null}
      {children}
    </FlexBox>
  );
}

/** 카드를 담는 격자. 좁은 화면에서는 한 줄로 내려감 */
export function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "12px",
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}
