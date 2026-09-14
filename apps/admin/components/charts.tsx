"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// 운영 화면 차트 조각. 무채색 한 계열이 기본이고 유채색은 부정 신호에만 씀
// 한 차트는 한 계열만 그림. 두 계열을 겹치면 무엇을 읽는 차트인지 흐려짐

const NEUTRAL: ChartConfig = { value: { label: "값", color: "var(--chart-3)" } };
const NEGATIVE: ChartConfig = { value: { label: "값", color: "var(--destructive)" } };

/** 비율 하나. 값 자체가 메시지라 막대를 두지 않음 */
export function Ratio({
  value,
  total,
  label,
  tone = "neutral",
}: {
  value: number;
  total: number;
  label: string;
  tone?: "neutral" | "negative";
}) {
  const ratio = total <= 0 ? 0 : value / total;

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          "text-4xl font-bold tabular-nums leading-none",
          tone === "negative" && "text-destructive",
        )}
      >
        {total <= 0 ? "-" : `${Math.round(ratio * 1000) / 10}%`}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
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
  tone?: "neutral" | "negative" | "accent";
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          "text-4xl font-bold tabular-nums leading-none",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </span>
      {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** 작은 값 하나. 카드 안에 여러 개를 나란히 둘 때 */
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
  tone?: "neutral" | "negative";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-0.5">
        <span
          className={cn(
            "text-lg font-bold tabular-nums",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
      </span>
      {note ? <span className="text-[11px] text-muted-foreground">{note}</span> : null}
    </div>
  );
}

/** 달성과 상한이 함께 있는 값. 배점처럼 최댓값이 정해진 축에만 씀 */
export function TrackBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const ratio = max <= 0 ? 0 : Math.min(100, (value / max) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm">{label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value} / {max}
        </span>
      </div>
      <Progress value={ratio} className="h-2" />
    </div>
  );
}

/** 같은 뜻의 값이 여러 줄일 때. 가로 막대로 길이를 견줌 */
export function BarList({
  rows,
  tone = "neutral",
  emptyText = "값이 없습니다",
}: {
  rows: { label: string; value: number; note?: string }[];
  tone?: "neutral" | "negative";
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  // 한 줄짜리 막대는 언제나 가득 차 아무것도 말하지 않음. 값만 적음
  if (rows.length === 1) {
    const row = rows[0]!;
    return (
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm">{row.label}</span>
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            tone === "negative" && "text-destructive",
          )}
        >
          {row.note ?? row.value.toLocaleString()}
        </span>
      </div>
    );
  }

  return (
    <ChartContainer
      config={tone === "negative" ? NEGATIVE : NEUTRAL}
      className="w-full"
      style={{ height: `${Math.max(80, rows.length * 34)}px` }}
    >
      <BarChart
        accessibilityLayer
        data={rows}
        layout="vertical"
        margin={{ left: 4, right: 40, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="2 2" />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={96}
          tick={{ fontSize: 12 }}
        />
        <XAxis dataKey="value" type="number" hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={0} barSize={14}>
          <LabelList
            dataKey="value"
            position="right"
            offset={6}
            className="fill-muted-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** 날짜별 한 계열. 값이 0 인 날도 자리를 지켜 빈 구간이 보이게 함 */
export function DayBars({
  rows,
  tone = "neutral",
  emptyText = "기록이 없습니다",
}: {
  rows: { day: string; value: number }[];
  tone?: "neutral" | "negative";
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ChartContainer
      config={tone === "negative" ? NEGATIVE : NEUTRAL}
      className="h-32 w-full"
    >
      <BarChart
        accessibilityLayer
        data={rows}
        margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="2 2" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: string) => value.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis width={28} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={0} />
      </BarChart>
    </ChartContainer>
  );
}
