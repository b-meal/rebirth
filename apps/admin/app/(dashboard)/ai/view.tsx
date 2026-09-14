"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { BarList, DayBars, Hero, Metric, Ratio, TrackBar } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reviewPair, type ReviewActionResult } from "./actions";

// AI 운영 화면. 세 축이 각각 무엇을 메우는지와 그 증거를 위에 두고 원장은 맨 아래에 둠
// 더미로 만든 기록은 머릿수에서 빼고 따로 표시함. 섞으면 제출 자료가 사실과 어긋남

export type AiDashboard = {
  models: { vision: string; review: string; embedding: string };
  real: {
    total: number;
    succeeded: number;
    failed: number;
    running: number;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    maxLatencyMs: number | null;
    lastRunAt: string | null;
  } | null;
  orphanFailures: number;
  mockRuns: number;
  totalRuns: number;
  byModel: {
    model: string;
    promptVersion: string;
    total: number;
    succeeded: number;
    avgLatencyMs: number | null;
  }[];
  failures: { failureCode: string; count: number }[];
  days: { day: string; total: number; failed: number }[];
  editedFields: { field: string; edits: number }[];
  acceptance: { withDraft: number; untouched: number; avgEdits: number } | null;
  scoreBuckets: { bucket: string; count: number }[];
  breakdown: {
    pairs: number;
    avgScore: number;
    maxScore: number;
    distance: number;
    time: number;
    color: number;
    size: number;
    features: number;
  } | null;
  reviewSummary: {
    verdict: string;
    label: string;
    total: number;
    avgLatencyMs: number | null;
  }[];
  reviews: {
    lostId: string;
    sightingId: string;
    verdict: string;
    label: string;
    agreements: string[];
    conflicts: string[];
    checkFirst: string | null;
    model: string;
    latencyMs: number | null;
    createdAt: string;
  }[];
  unreviewed: { lostId: string; sightingId: string; score: number }[];
  coverage: {
    reports: number;
    embedded: number;
    model: string | null;
    lastAt: string | null;
  } | null;
  neighbors: {
    lostId: string;
    lostText: string;
    sightingId: string;
    sightingText: string;
    similarity: number;
    scored: boolean;
  }[];
  jobs: {
    id: string;
    status: string;
    failureCode: string | null;
    model: string | null;
    latencyMs: number | null;
    createdAt: string;
  }[];
};

const ms = (value: number | null) =>
  value === null ? "-" : `${value.toLocaleString()}ms`;

// 시드 픽스처는 UUID 앞자리가 모두 0 이라 뒷자리로 구분함
const shortId = (value: string) => value.slice(-8);

const when = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function RunButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "재평가 중" : "재평가"}
    </Button>
  );
}

/** 한 쌍씩 버튼으로 돌림. 배치로 돌리면 호출 비용이 후보 수만큼 그대로 늘어남 */
function ReviewRunner({
  pair,
}: {
  pair: { lostId: string; sightingId: string; score: number };
}) {
  const [state, action] = useActionState<ReviewActionResult, FormData>(reviewPair, {
    ok: false,
  });

  return (
    <form action={action} className="flex items-center justify-between gap-2">
      <input type="hidden" name="lostId" value={pair.lostId} />
      <input type="hidden" name="sightingId" value={pair.sightingId} />
      <span className="text-xs text-muted-foreground">
        {pair.score}점 · 제보 {shortId(pair.sightingId)}
      </span>
      <span className="flex items-center gap-2">
        {state.message ? (
          <span
            className={
              state.ok ? "text-[11px] text-muted-foreground" : "text-[11px] text-destructive"
            }
          >
            {state.message}
          </span>
        ) : null}
        <RunButton />
      </span>
    </form>
  );
}

function ReviewCard({ review }: { review: AiDashboard["reviews"][number] }) {
  return (
    <div className="flex flex-col gap-1.5 bg-muted p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{review.label}</Badge>
        <span className="text-[11px] text-muted-foreground">
          {review.model} · {ms(review.latencyMs)} · {when(review.createdAt)}
        </span>
      </div>
      {review.agreements.length > 0 ? (
        <p className="text-xs">겹침 {review.agreements.join(" · ")}</p>
      ) : null}
      {review.conflicts.length > 0 ? (
        <p className="text-xs text-destructive">어긋남 {review.conflicts.join(" · ")}</p>
      ) : null}
      {review.checkFirst ? (
        <p className="text-xs text-muted-foreground">먼저 확인 {review.checkFirst}</p>
      ) : null}
      <Link
        href={`/sightings/${review.sightingId}`}
        className="text-[11px] text-muted-foreground underline underline-offset-2"
      >
        제보 {shortId(review.sightingId)} 열기
      </Link>
    </div>
  );
}

function NeighborCard({ pair }: { pair: AiDashboard["neighbors"][number] }) {
  return (
    <div className="flex flex-col gap-1.5 bg-muted p-3">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold tabular-nums">
          {pair.similarity.toFixed(3)}
        </span>
        <Badge variant={pair.scored ? "outline" : "default"}>
          {pair.scored ? "배점도 올림" : "배점이 놓침"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">실종 {pair.lostText}</p>
      <p className="text-xs">제보 {pair.sightingText}</p>
      <Link
        href={`/sightings/${pair.sightingId}`}
        className="text-[11px] text-muted-foreground underline underline-offset-2"
      >
        제보 {shortId(pair.sightingId)} 열기
      </Link>
    </div>
  );
}

export function AiView({ data }: { data: AiDashboard }) {
  const { real, acceptance, breakdown, coverage } = data;
  const missed = data.neighbors.filter((pair) => !pair.scored).length;
  const reviewTotal = data.reviewSummary.reduce((sum, row) => sum + row.total, 0);
  const calls = (real?.total ?? 0) + reviewTotal + (coverage?.embedded ?? 0);

  const scorecard = [
    {
      label: "AI 가 손댄 기록",
      value: coverage
        ? `${coverage.embedded.toLocaleString()} / ${coverage.reports.toLocaleString()}`
        : "-",
      source: "제보 전체 대비 벡터가 붙은 수",
    },
    {
      label: "모델 호출",
      value: calls.toLocaleString(),
      source: `외형 초안 ${real?.total ?? 0} · 재평가 ${reviewTotal} · 임베딩 ${(coverage?.embedded ?? 0).toLocaleString()}`,
    },
    {
      label: "AI 가 혼자 찾은 후보",
      value: `${missed}쌍`,
      source: "배점이 올리지 않았고 벡터가 올린 쌍",
    },
    {
      label: "배포 모델 실패율",
      value:
        real && real.total > 0
          ? `${Math.round((real.failed / real.total) * 1000) / 10}%`
          : "-",
      source: `${data.models.vision} · 실패 ${real?.failed ?? 0}건`,
    },
    {
      label: "사람이 고치지 않은 초안",
      value:
        acceptance && acceptance.withDraft > 0
          ? `${Math.round((acceptance.untouched / acceptance.withDraft) * 1000) / 10}%`
          : "-",
      source: acceptance?.withDraft
        ? `초안 붙은 제보 ${acceptance.withDraft}건`
        : "초안이 붙은 제보 없음",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">AI 파이프라인</h1>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AI 활용</TableHead>
                <TableHead className="text-right">값</TableHead>
                <TableHead>근거</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scorecard.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right text-base font-bold tabular-nums">
                    {row.value}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 1. 세 축이 지금 어떤 상태인지 */}
      <div className="grid items-start gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>사진 → 외형 초안</CardTitle>
            <CardDescription>{data.models.vision}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {real && real.total > 0 ? (
              <>
                <Ratio
                  value={real.succeeded}
                  total={real.total}
                  label={`성공 ${real.succeeded}/${real.total}`}
                />
                <div className="flex flex-wrap gap-6">
                  <Metric label="평균" value={ms(real.avgLatencyMs)} />
                  <Metric label="p95" value={ms(real.p95LatencyMs)} />
                  <Metric label="마지막" value={when(real.lastRunAt)} />
                </div>
                {data.orphanFailures > 0 ? (
                  <Metric
                    label="모델 기록 전 실패"
                    value={String(data.orphanFailures)}
                    unit="건"
                    tone="negative"
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">실제 호출 기록이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>문장 → 의미 벡터</CardTitle>
            <CardDescription>{data.models.embedding} · 384차원</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {coverage && coverage.reports > 0 ? (
              <>
                <Ratio
                  value={coverage.embedded}
                  total={coverage.reports}
                  label={`${coverage.embedded.toLocaleString()} / ${coverage.reports.toLocaleString()}건`}
                />
                <div className="flex flex-wrap gap-6">
                  <Metric
                    label="배점이 놓친 쌍"
                    value={String(missed)}
                    unit="건"
                  />
                  <Metric label="마지막 생성" value={when(coverage.lastAt)} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">아직 만들어진 벡터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>후보 → 확인 근거</CardTitle>
            <CardDescription>{data.models.review}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {reviewTotal > 0 ? (
              <>
                <Hero
                  value={reviewTotal.toLocaleString()}
                  unit="쌍"
                  label="근거를 붙인 후보"
                />
                <BarList
                  rows={data.reviewSummary.map((row) => ({
                    label: row.label,
                    value: row.total,
                  }))}
                />
                <Metric
                  label="평균 지연"
                  value={ms(data.reviewSummary[0]?.avgLatencyMs ?? null)}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">아직 재평가한 후보가 없습니다.</p>
            )}
            {data.unreviewed.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  아직 재평가하지 않은 상위 후보
                </span>
                {data.unreviewed.map((pair) => (
                  <ReviewRunner key={`${pair.lostId}-${pair.sightingId}`} pair={pair} />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {data.mockRuns > 0 ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {data.models.vision} {real?.total ?? 0}건 기준 · 더미 {data.mockRuns.toLocaleString()}건
          제외 · 전체 {data.totalRuns.toLocaleString()}건
        </p>
      ) : null}

      <Separator />

      {/* 2. 세 축이 서로를 메운다는 증거 */}
      <h2 className="text-base font-bold">세 축이 서로를 메웁니다</h2>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>축</TableHead>
                <TableHead>보는 것</TableHead>
                <TableHead>못 보는 것</TableHead>
                <TableHead>지금</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">결정식 배점</TableCell>
                <TableCell>거리 · 시각 · 털색 · 크기 · 특징</TableCell>
                <TableCell className="text-muted-foreground">
                  같은 뜻을 다르게 쓴 문장
                </TableCell>
                <TableCell className="tabular-nums">
                  {breakdown ? `${breakdown.pairs}쌍 · 평균 ${breakdown.avgScore}점` : "-"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">의미 벡터</TableCell>
                <TableCell>외형 문장의 의미</TableCell>
                <TableCell className="text-muted-foreground">거리와 시각</TableCell>
                <TableCell className="tabular-nums">
                  {coverage ? `${coverage.embedded.toLocaleString()}건 임베딩` : "-"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Claude 재평가</TableCell>
                <TableCell>두 기록을 읽고 겹침과 어긋남</TableCell>
                <TableCell className="text-muted-foreground">
                  비용과 지연이 후보 수만큼 늘어남
                </TableCell>
                <TableCell className="tabular-nums">
                  {reviewTotal > 0 ? `${reviewTotal}쌍 판정` : "-"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>벡터가 찾고 배점이 놓친 쌍</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.neighbors.length > 0 ? (
              data.neighbors.map((pair) => (
                <NeighborCard key={`${pair.lostId}-${pair.sightingId}`} pair={pair} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">아직 이웃을 찾지 못했습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claude 가 쓴 확인 근거</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.reviews.length > 0 ? (
              data.reviews.map((review) => (
                <ReviewCard key={`${review.lostId}-${review.sightingId}`} review={review} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">아직 재평가한 후보가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 3. 품질 */}
      <h2 className="text-base font-bold">품질</h2>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>일자별 실행</CardTitle>
            <CardDescription>최근 {data.days.length}일 · 더미 포함</CardDescription>
          </CardHeader>
          <CardContent>
            <DayBars rows={data.days.map((d) => ({ day: d.day, value: d.total }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일자별 실패</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DayBars
              rows={data.days.map((d) => ({ day: d.day, value: d.failed }))}
              tone="negative"
            />
            {data.failures.length > 0 ? (
              <BarList
                rows={data.failures.map((row) => ({
                  label: row.failureCode,
                  value: row.count,
                }))}
                tone="negative"
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>유사도 배점 항목별 평균</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {breakdown && breakdown.pairs > 0 ? (
              <>
                <TrackBar label="거리" value={breakdown.distance} max={35} />
                <TrackBar label="시각" value={breakdown.time} max={25} />
                <TrackBar label="털색" value={breakdown.color} max={20} />
                <TrackBar label="크기" value={breakdown.size} max={10} />
                <TrackBar label="특징" value={breakdown.features} max={10} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">채점된 쌍이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>후보 점수 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.scoreBuckets.map((row) => ({
                label: `${row.bucket}점`,
                value: row.count,
              }))}
              emptyText="채점된 쌍이 없습니다"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 초안을 사람이 고친 필드</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {acceptance && acceptance.withDraft > 0 ? (
              <>
                <Ratio
                  value={acceptance.untouched}
                  total={acceptance.withDraft}
                  label={`무수정 ${acceptance.untouched}/${acceptance.withDraft}`}
                />
                <BarList
                  rows={data.editedFields.map((row) => ({
                    label: row.field,
                    value: row.edits,
                  }))}
                  emptyText="고쳐진 필드가 없습니다"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                초안이 붙은 제보가 아직 없습니다. 새 제보부터 모델과 원본이 함께 저장됩니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>모델별 실행</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.byModel.map((row) => ({
                label: row.model,
                value: row.total,
              }))}
              emptyText="기록이 없습니다"
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 4. 원장 */}
      <h2 className="text-base font-bold">최근 실행 {data.jobs.length}건</h2>
      <Card>
        <CardContent>
          {data.jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시각</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>모델</TableHead>
                  <TableHead className="text-right">지연</TableHead>
                  <TableHead>실패 코드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="tabular-nums">{when(job.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={job.status === "failed" ? "destructive" : "outline"}>
                        {job.status === "succeeded"
                          ? "성공"
                          : job.status === "failed"
                            ? "실패"
                            : job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.model ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ms(job.latencyMs)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.failureCode ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
