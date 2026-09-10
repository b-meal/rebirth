"use client";

import type { ReactNode } from "react";
import { Box, Flex, Grid, Text, chakra } from "@chakra-ui/react";

import { Demo, Spec, SpecTable, Token, Usage } from "./spec";

// 좁은 폭에서 읽히는 최소 차트, 라이브러리 없이 인라인 svg 와 상자로만 그리는 기준

const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// 서버와 클라이언트 마크업을 같게 두려고 모듈 수준에 고정한 표본
const WEEK_REPORTS = [14, 18, 15, 22, 19, 24, 16];

const WEEK_REPORTS_DOWN = [26, 24, 22, 19, 17, 14, 12];

const DAILY_REPORTS = [
  8, 11, 9, 14, 12, 16, 13, 15, 19, 17, 14, 18, 22, 20, 17, 21, 25, 23, 19, 24, 27, 25, 22, 26, 30,
  28, 24, 29, 33, 31,
];

const DAY_TICKS = ["2026년 8월 12일", "8월 26일", "9월 10일"];

const SPECIES = [
  { label: "개", value: 79 },
  { label: "고양이", value: 40 },
  { label: "그 외", value: 9 },
];

const CARE = [
  { label: "배회 중", value: 72, color: "brand.500" },
  { label: "제보자 보호 중", value: 40, color: "brand.700" },
  { label: "확인되지 않음", value: 16, color: "gray.300" },
];

const SPARK_W = 72;
const SPARK_H = 24;

const LINE_W = 300;
const LINE_H = 100;
const LINE_BASE = 92;

const DONUT_R = 42;
const DONUT_C = 2 * Math.PI * DONUT_R;

const CARE_TOTAL = CARE.reduce((sum, item) => sum + item.value, 0);

const DONUT_ARCS = CARE.map((item, index) => {
  const before = CARE.slice(0, index).reduce((sum, previous) => sum + previous.value, 0);
  return {
    ...item,
    length: (item.value / CARE_TOTAL) * DONUT_C,
    offset: (before / CARE_TOTAL) * DONUT_C,
    percent: Math.round((item.value / CARE_TOTAL) * 100),
  };
});

const HEAT_WEEKS = 12;
const HEAT_CELL = 18;
const HEAT_GAP = 3;
const HEAT_START = "2026-06-15";
const HEAT_STEPS = ["bg.subtle", "brand.200", "brand.400", "brand.600", "brand.800"];

const HEAT_COUNTS = Array.from({ length: HEAT_WEEKS * 7 }, (_, index) => {
  const noise = (index * 7 + index * index * 3) % 11;
  const weekend = index % 7 >= 5 ? 3 : 0;
  return Math.max(0, noise - 3 + weekend + Math.floor(index / 28));
});

function heatStep(count: number) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

function heatDate(offset: number) {
  const date = new Date(`${HEAT_START}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

function heatLabel(offset: number) {
  const date = heatDate(offset);
  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

function sparkPoints(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = SPARK_W / (values.length - 1);
  return values
    .map((value, index) => {
      const x = (index * step).toFixed(2);
      const y = (SPARK_H - 2 - ((value - min) / span) * (SPARK_H - 4)).toFixed(2);
      return `${x},${y}`;
    })
    .join(" ");
}

const LINE_MAX = Math.max(...DAILY_REPORTS);
const LINE_STEP = (LINE_W - 8) / (DAILY_REPORTS.length - 1);
const LINE_POINTS = DAILY_REPORTS.map((value, index) => ({
  x: Number((4 + index * LINE_STEP).toFixed(2)),
  y: Number((LINE_BASE - (value / LINE_MAX) * 70).toFixed(2)),
}));
const LINE_PATH = LINE_POINTS.map((point) => `${point.x},${point.y}`).join(" ");
const LINE_LAST = LINE_POINTS[LINE_POINTS.length - 1];
const LINE_END = DAILY_REPORTS[DAILY_REPORTS.length - 1];

function Sparkline({
  values,
  label,
  area = false,
  tone = "up",
}: {
  values: number[];
  label: string;
  area?: boolean;
  tone?: "up" | "down";
}) {
  const points = sparkPoints(values);
  return (
    <chakra.svg
      role="img"
      aria-label={label}
      width={`${SPARK_W}px`}
      height={`${SPARK_H}px`}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      display="block"
      flexShrink={0}
      color={tone === "up" ? "brand.fg" : "fg.alternative"}
    >
      {area ? (
        <chakra.polygon
          points={`0,${SPARK_H} ${points} ${SPARK_W},${SPARK_H}`}
          fill="brand.muted"
        />
      ) : null}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </chakra.svg>
  );
}

function StatRow({
  label,
  value,
  delta,
  tone = "up",
  children,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down";
  children: ReactNode;
}) {
  return (
    <Flex align="center" justify="space-between" gap="3" width="100%" minWidth="0">
      <Box minWidth="0">
        <Text textStyle="caption" color="fg.assistive">
          {label}
        </Text>
        <Flex align="baseline" gap="1.5">
          <Text textStyle="title3">{value}</Text>
          {delta ? (
            <Text textStyle="caption" color={tone === "up" ? "brand.fg" : "fg.alternative"}>
              {delta}
            </Text>
          ) : null}
        </Flex>
      </Box>
      {children}
    </Flex>
  );
}

function VerticalBars() {
  const max = Math.max(...WEEK_REPORTS);
  return (
    <Flex
      direction="column"
      gap="1.5"
      width="100%"
      role="img"
      aria-label={`요일별 제보 수, ${WEEK_LABELS.map((day, index) => `${day} ${WEEK_REPORTS[index]}건`).join(", ")}`}
    >
      <Flex
        align="flex-end"
        gap="1.5"
        borderBottomWidth="1px"
        borderColor="border"
        paddingBottom="1.5"
      >
        {WEEK_REPORTS.map((value, index) => (
          <Flex key={WEEK_LABELS[index]} direction="column" align="center" gap="1" flex="1" minWidth="0">
            <Text
              textStyle="caption"
              color={value === max ? "fg.default" : "fg.assistive"}
              fontWeight={value === max ? "600" : "400"}
            >
              {value}
            </Text>
            <Box
              width="100%"
              height={`${Math.round((value / max) * 96)}px`}
              borderTopRadius="4px"
              backgroundColor={value === max ? "brand.solid" : "brand.muted"}
            />
          </Flex>
        ))}
      </Flex>
      <Flex gap="1.5">
        {WEEK_LABELS.map((day, index) => (
          <Text
            key={day}
            textStyle="caption"
            color={WEEK_REPORTS[index] === max ? "fg.default" : "fg.assistive"}
            flex="1"
            minWidth="0"
            textAlign="center"
          >
            {day}
          </Text>
        ))}
      </Flex>
    </Flex>
  );
}

function HorizontalBars() {
  const total = SPECIES.reduce((sum, item) => sum + item.value, 0);
  const rows = SPECIES.map((item) => ({
    ...item,
    percent: Math.round((item.value / total) * 100),
  }));
  return (
    <Flex
      direction="column"
      gap="2.5"
      width="100%"
      role="img"
      aria-label={`동물 종류 비율, ${rows.map((row) => `${row.label} ${row.percent}퍼센트`).join(", ")}`}
    >
      {rows.map((row, index) => (
        <Flex key={row.label} align="center" gap="2">
          <Text textStyle="caption" width="48px" flexShrink={0} color="fg.alternative">
            {row.label}
          </Text>
          <Box
            flex="1"
            minWidth="0"
            height="14px"
            borderRadius="full"
            backgroundColor="bg.subtle"
            overflow="hidden"
          >
            <Box
              height="100%"
              width={`${row.percent}%`}
              borderRadius="full"
              backgroundColor={index === 0 ? "brand.solid" : "brand.muted"}
            />
          </Box>
          <Text textStyle="caption" width="40px" flexShrink={0} textAlign="end">
            {row.percent}%
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

function LineChart() {
  return (
    <Flex direction="column" gap="2" width="100%" minWidth="0">
      <chakra.svg
        role="img"
        aria-label={`최근 30일 제보 추이, 시작 ${DAILY_REPORTS[0]}건에서 마지막 ${LINE_END}건까지 늘어남`}
        viewBox={`0 0 ${LINE_W} ${LINE_H}`}
        width="100%"
        height="auto"
        display="block"
        color="brand.fg"
      >
        <chakra.polygon
          points={`4,${LINE_BASE} ${LINE_PATH} ${LINE_W - 4},${LINE_BASE}`}
          fill="brand.muted"
        />
        <chakra.g stroke="border">
          <line x1="4" y1={LINE_BASE} x2={LINE_W - 4} y2={LINE_BASE} strokeWidth="1" />
        </chakra.g>
        <polyline
          points={LINE_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={LINE_LAST.x} cy={LINE_LAST.y} r="3.5" fill="currentColor" />
        <chakra.g fill="fg.default">
          <text x={LINE_W - 4} y={LINE_LAST.y - 9} textAnchor="end" fontSize="11" fontWeight="600">
            {`${LINE_END}건`}
          </text>
        </chakra.g>
      </chakra.svg>
      <Flex justify="space-between">
        {DAY_TICKS.map((tick) => (
          <Text key={tick} textStyle="caption" color="fg.assistive">
            {tick}
          </Text>
        ))}
      </Flex>
    </Flex>
  );
}

function Donut() {
  return (
    <Flex direction="column" gap="4" width="100%" align="center">
      <Box position="relative" width="120px" height="120px" flexShrink={0}>
        <chakra.svg
          role="img"
          aria-label={`보호 상황 비율, ${DONUT_ARCS.map((arc) => `${arc.label} ${arc.percent}퍼센트`).join(", ")}`}
          viewBox="0 0 120 120"
          width="120px"
          height="120px"
          display="block"
        >
          <g transform="rotate(-90 60 60)">
            {DONUT_ARCS.map((arc) => (
              <chakra.g key={arc.label} stroke={arc.color}>
                <circle
                  cx="60"
                  cy="60"
                  r={DONUT_R}
                  fill="none"
                  strokeWidth="16"
                  strokeDasharray={`${arc.length.toFixed(2)} ${(DONUT_C - arc.length).toFixed(2)}`}
                  strokeDashoffset={(-arc.offset).toFixed(2)}
                />
              </chakra.g>
            ))}
          </g>
        </chakra.svg>
        <Flex position="absolute" inset="0" direction="column" align="center" justify="center">
          <Text textStyle="title3">{CARE_TOTAL}</Text>
          <Text textStyle="caption" color="fg.assistive">
            건
          </Text>
        </Flex>
      </Box>
      <Flex direction="column" gap="2" width="100%">
        {DONUT_ARCS.map((arc) => (
          <Flex key={arc.label} align="center" gap="2.5">
            <Box
              width="10px"
              height="10px"
              flexShrink={0}
              borderRadius="full"
              borderWidth="1px"
              borderColor="border.emphasized"
              backgroundColor={arc.color}
            />
            <Text textStyle="bodySm" flex="1" minWidth="0" truncate>
              {arc.label}
            </Text>
            <Text textStyle="caption" color="fg.alternative" flexShrink={0}>
              {arc.value}건
            </Text>
            <Text textStyle="label" width="36px" flexShrink={0} textAlign="end">
              {arc.percent}%
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}

function Heatmap() {
  const total = HEAT_COUNTS.reduce((sum, count) => sum + count, 0);
  const columns = Array.from({ length: HEAT_WEEKS }, (_, week) => week);
  const monthMark = columns.map((week) => {
    const current = heatDate(week * 7).getUTCMonth();
    const previous = week === 0 ? -1 : heatDate((week - 1) * 7).getUTCMonth();
    return current === previous ? null : `${current + 1}월`;
  });

  return (
    <Flex direction="column" gap="3" minWidth="0">
      <Grid
        role="img"
        aria-label={`제보 달력, ${heatLabel(0)}부터 ${heatLabel(HEAT_WEEKS * 7 - 1)}까지 합계 ${total}건`}
        templateColumns={`20px repeat(${HEAT_WEEKS}, ${HEAT_CELL}px)`}
        gap={`${HEAT_GAP}px`}
      >
        <Box />
        {columns.map((week) => (
          <Box key={`month-${week}`} position="relative" height="14px">
            {monthMark[week] ? (
              <Text
                position="absolute"
                top="0"
                insetStart="0"
                textStyle="overline"
                color="fg.assistive"
                whiteSpace="nowrap"
              >
                {monthMark[week]}
              </Text>
            ) : null}
          </Box>
        ))}
        {WEEK_LABELS.map((day, dayIndex) => (
          <Box key={day} display="contents">
            <Flex align="center" height={`${HEAT_CELL}px`}>
              <Text textStyle="overline" color="fg.assistive">
                {day}
              </Text>
            </Flex>
            {columns.map((week) => {
              const offset = week * 7 + dayIndex;
              const count = HEAT_COUNTS[offset];
              return (
                <Box
                  key={`cell-${offset}`}
                  height={`${HEAT_CELL}px`}
                  borderRadius="3px"
                  backgroundColor={HEAT_STEPS[heatStep(count)]}
                  borderWidth={count === 0 ? "1px" : "0"}
                  borderColor="border.muted"
                  title={`${heatLabel(offset)} ${count}건`}
                />
              );
            })}
          </Box>
        ))}
      </Grid>
      <Flex align="center" gap="1.5">
        <Text textStyle="caption" color="fg.assistive">
          적음
        </Text>
        {HEAT_STEPS.map((step, index) => (
          <Box
            key={step}
            width="12px"
            height="12px"
            borderRadius="3px"
            backgroundColor={step}
            borderWidth={index === 0 ? "1px" : "0"}
            borderColor="border.muted"
          />
        ))}
        <Text textStyle="caption" color="fg.assistive">
          많음
        </Text>
      </Flex>
    </Flex>
  );
}

export function ChartsCatalog() {
  return (
    <>
      <Spec
        id="sparkline"
        title="Sparkline"
        description={
          <>
            숫자 하나 옆에 붙는 추이선입니다. 눈금과 축을 두지 않고 방향만 보여 주므로 값은 반드시
            옆의 숫자로 함께 읽습니다. 색은 감싼 상자의 <Token>color</Token> 를 따릅니다.
          </>
        }
      >
        <Demo label="Stat 행" note="라벨과 값이 왼쪽, 추이선이 오른쪽에 붙습니다">
          <StatRow label="최근 7일 제보" value="128건" delta="+18%">
            <Sparkline values={WEEK_REPORTS} label="최근 7일 제보가 늘어나는 추이" />
          </StatRow>
        </Demo>

        <Demo label="variant">
          <StatRow label="선만 쓰는 기본" value="128건">
            <Sparkline values={WEEK_REPORTS} label="선으로만 그린 최근 7일 추이" />
          </StatRow>
          <StatRow label="면을 채운 형태" value="128건" delta="+18%">
            <Sparkline values={WEEK_REPORTS} label="면을 채운 최근 7일 추이" area />
          </StatRow>
          <StatRow label="줄어드는 추이" value="134건" delta="-12%" tone="down">
            <Sparkline
              values={WEEK_REPORTS_DOWN}
              label="최근 7일 제보가 줄어드는 추이"
              tone="down"
            />
          </StatRow>
        </Demo>

        <SpecTable
          rows={[
            ["크기", "72 x 24, 값 7개 기준"],
            ["선 두께", "2, linecap round"],
            [
              "색",
              <>
                상승은 <Token>brand.fg</Token>, 하락은 <Token>fg.alternative</Token>, 면은{" "}
                <Token>brand.muted</Token>
              </>,
            ],
            ["접근성", "role img 과 aria-label 로 추이를 문장으로 남기고 값은 옆 숫자로 읽음"],
          ]}
        />

        <Usage
          code={`<polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />`}
        />
      </Spec>

      <Spec
        id="bar-chart"
        title="Bar Chart"
        description="항목 수가 열 개 미만일 때만 씁니다. 격자선은 밑선 하나만 두고 값은 막대 위에 직접 적어 색을 읽지 않아도 크기를 알 수 있게 합니다."
      >
        <Demo label="요일별 제보 수" note="가장 큰 막대만 brand.solid, 나머지는 brand.muted 로 둡니다">
          <VerticalBars />
        </Demo>

        <Demo label="가로 막대" note="이름이 길거나 비율을 보여줄 때는 가로로 눕힙니다">
          <HorizontalBars />
        </Demo>

        <SpecTable
          rows={[
            ["막대 높이", "최댓값 96, 나머지는 비율로 계산"],
            ["막대 간격", "6, 라벨 행과 같은 간격으로 정렬"],
            ["격자", "밑선 1px border 만, 가로 격자선 없음"],
            ["값 표기", "막대 위 숫자, 최댓값은 굵게"],
          ]}
        />
      </Spec>

      <Spec
        id="line-chart"
        title="Line Chart"
        description="값이 서른 개 안팎으로 이어질 때 씁니다. 마지막 점에만 값을 적어 지금이 어디인지 먼저 보이게 합니다."
      >
        <Demo label="30일 추이" note="좁은 폭에서는 눈금을 3개 이하로 둡니다">
          <LineChart />
        </Demo>

        <SpecTable
          rows={[
            ["눈금", "가로 3개까지, 세로 눈금 없음"],
            ["영역", "선 아래를 brand.muted 로 채워 방향을 강조"],
            ["마지막 점", "반지름 3.5 의 점과 값 라벨"],
            ["폭", "viewBox 300 x 100, 부모 폭에 맞춰 늘어남"],
          ]}
        />
      </Spec>

      <Spec
        id="donut-chart"
        title="Donut Chart"
        description="세 조각까지만 씁니다. 조각 안에 글자를 넣지 않고 아래 목록에서 값과 비율을 읽습니다."
      >
        <Demo label="보호 상황 비율" note="가운데 숫자는 합계, 조각 순서는 값이 큰 쪽부터입니다">
          <Donut />
        </Demo>

        <SpecTable
          rows={[
            ["두께", "지름 84 의 원에 stroke 16"],
            [
              "색",
              <>
                <Token>brand.500</Token>, <Token>brand.700</Token>, <Token>gray.300</Token> 세 개
                고정
              </>,
            ],
            ["중앙 라벨", "합계 숫자와 단위, 조각 비율은 넣지 않음"],
            ["목록", "색 점과 이름, 건수, 비율 네 열"],
          ]}
        />

        <Usage
          code={`<circle r="42" fill="none" strokeWidth="16" strokeDasharray="146.6 117.3" />`}
        />
      </Spec>

      <Spec
        id="heatmap"
        title="Heatmap Calendar"
        description="언제 제보가 몰리는지 보는 달력입니다. 칸 하나가 하루이고 색 단계는 다섯 개까지만 둡니다."
      >
        <Demo label="12주 달력" note="칸에 커서를 올리면 날짜와 건수가 뜹니다">
          <Heatmap />
        </Demo>

        <SpecTable
          rows={[
            ["칸 크기", "18 x 18, 간격 3"],
            ["폭", "요일 라벨 20 을 더해 272, 350 안에 들어감"],
            [
              "단계",
              <>
                <Token>bg.subtle</Token> 부터 <Token>brand.800</Token> 까지 다섯 단계
              </>,
            ],
            ["0건", "배경 대신 border.muted 테두리로 빈 칸임을 표시"],
            ["접근성", "칸마다 title 로 날짜와 건수, 전체는 aria-label 로 합계"],
          ]}
        />
      </Spec>
    </>
  );
}
