"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { BarList, DayBars, Metric, Ratio } from "@/components/charts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { syncGovData, type SyncResult } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CARE_LABEL } from "@/lib/labels";

// 운영 지표. AI 품질은 AI 화면이 맡고 여기는 제보 흐름만 봄

export type MetricsData = {
  gov: {
    kinds: number;
    sido: number;
    sigungu: number;
    statDays: number;
    lastCollectedOn: string | null;
  } | null;
  rescueStates: { processState: string; total: number }[];
  rescueKinds: { upKindNm: string; total: number }[];
  rescueSido: { sidoNm: string; total: number; sheltered: number }[];
  breed: { withGuess: number; matched: number; distinct: number } | null;
  unmatchedBreeds: { breedGuess: string; total: number }[];
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

function SyncButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "수집 중" : "지금 수집"}
    </Button>
  );
}

/** 공고 전량을 훑어 1분 남짓 걸림. 눌러서 돌리는 자리 */
function GovSync() {
  const [state, action] = useActionState<SyncResult, FormData>(syncGovData, {
    ok: false,
  });

  return (
    <form action={action} className="flex items-center gap-2">
      <SyncButton />
      {state.message ? (
        <span
          className={
            state.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"
          }
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

export function MetricsView({ data }: { data: MetricsData }) {
  const rescueTotal = data.rescueStates.reduce((sum, row) => sum + row.total, 0);
  const sheltered =
    data.rescueStates.find((row) => row.processState === "보호중")?.total ?? 0;
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
      <Separator />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">국가동물보호정보시스템</h2>
        <GovSync />
      </div>

      {data.gov ? (
        <div className="grid items-start gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">공고 구조동물</span>
              <span className="text-2xl font-bold tabular-nums">
                {rescueTotal.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                보호중 {sheltered.toLocaleString()}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">표준 품종 코드</span>
              <span className="text-2xl font-bold tabular-nums">
                {data.gov.kinds.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">개, 고양이, 기타</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">행정 코드</span>
              <span className="text-2xl font-bold tabular-nums">
                {data.gov.sido} / {data.gov.sigungu}
              </span>
              <span className="text-[11px] text-muted-foreground">시도 / 시군구</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">수집일</span>
              <span className="text-2xl font-bold tabular-nums">
                {data.gov.lastCollectedOn ?? "-"}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                누적 {data.gov.statDays}일
              </span>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">수집 기록 없음</p>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>처리 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.rescueStates.map((row) => ({
                label: row.processState,
                value: row.total,
              }))}
              emptyText="수집 기록 없음"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>축종</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.rescueKinds.map((row) => ({
                label: row.upKindNm,
                value: row.total,
              }))}
              emptyText="수집 기록 없음"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시도별 공고</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.rescueSido.map((row) => ({
                label: row.sidoNm.replace(/(특별자치시|특별자치도|광역시|특별시|도)$/, ""),
                value: row.total,
              }))}
              emptyText="수집 기록 없음"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>품종 표기 대조</CardTitle>
            <CardDescription>
              AI 초안의 breedGuess 를 표준 품종 코드와 맞춰 봄
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.breed && data.breed.withGuess > 0 ? (
              <>
                <Ratio
                  value={data.breed.matched}
                  total={data.breed.withGuess}
                  label={`표준 코드 일치 ${data.breed.matched}/${data.breed.withGuess}`}
                />
                <Metric
                  label="서로 다른 표기"
                  value={data.breed.distinct.toLocaleString()}
                  unit="종"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">품종 표기가 붙은 제보 없음</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>표준 코드에 없는 표기</CardTitle>
            <CardDescription>프롬프트를 고칠 대상</CardDescription>
          </CardHeader>
          <CardContent>
            {data.unmatchedBreeds.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>표기</TableHead>
                    <TableHead className="text-right">건수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.unmatchedBreeds.map((row) => (
                    <TableRow key={row.breedGuess}>
                      <TableCell>{row.breedGuess}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">모두 표준 코드에 있음</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}