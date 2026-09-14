"use client";

import { BarList, DayBars } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CARE_LABEL } from "@/lib/labels";

// 운영 지표. AI 품질은 AI 화면이 맡고 여기는 제보 흐름만 봄

export type MetricsData = {
  overview: {
    total: number;
    sightings: number;
    lost: number;
    hidden: number;
    resolved: number;
    last24h: number;
  } | null;
  daily: { day: string; sightings: number; lost: number }[];
  areas: { areaName: string; total: number; roaming: number }[];
  care: { careSituation: string; total: number }[];
};

export function MetricsView({ data }: { data: MetricsData }) {
  const { overview } = data;
  // 최근이 오른쪽에 오도록 뒤집음. 조회는 최신 순임
  const days = [...data.daily].reverse();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">지표</h1>

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "발견 제보", value: overview.sightings, note: "" },
            { label: "실종 신고", value: overview.lost, note: "" },
            { label: "만남으로 종료", value: overview.resolved, note: "제보자가 직접 표시" },
          ].map((tile) => (
            <Card key={tile.label}>
              <CardContent className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{tile.label}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {tile.value.toLocaleString()}
                </span>
                {tile.note ? (
                  <span className="text-[11px] text-muted-foreground">{tile.note}</span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">집계 조회 실패</p>
      )}

      <Separator />

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>일자별 발견 제보</CardTitle>
            <CardDescription>최근 {days.length}일</CardDescription>
          </CardHeader>
          <CardContent>
            <DayBars rows={days.map((row) => ({ day: row.day, value: row.sightings }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일자별 실종 신고</CardTitle>
          </CardHeader>
          <CardContent>
            <DayBars rows={days.map((row) => ({ day: row.day, value: row.lost }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>보호 상황</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.care.map((row) => ({
                label: CARE_LABEL[row.careSituation] ?? row.careSituation,
                value: row.total,
              }))}
              emptyText="제보 없음"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>지역 상위 {data.areas.length}곳</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.areas.slice(0, 10).map((row) => ({
                label: row.areaName.replace(/^(서울특별시|경기도|부산광역시)\s/, ""),
                value: row.total,
              }))}
              emptyText="제보 없음"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
