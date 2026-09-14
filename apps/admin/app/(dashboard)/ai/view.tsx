"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Button,
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  Divider,
  FlexBox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Typography,
} from "@wanteddev/wds";

import { reviewPair, type ReviewActionResult } from "./actions";

// AI 파이프라인 운영 화면. 사진 원본과 좌표는 읽지 않고 실행 기록만 봄
// 더미 모델로 만든 기록이 실제 호출과 섞이면 제출 자료가 사실과 어긋나므로 모델별로 갈라 둠

export type AiDashboard = {
  visionModel: string;
  reviewModel: string;
  mockModel: string;
  reviewSummary: { verdict: string; label: string; total: number; avgLatencyMs: number | null }[];
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
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    running: number;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    maxLatencyMs: number | null;
    lastRunAt: string | null;
  } | null;
  byModel: {
    model: string;
    promptVersion: string;
    total: number;
    succeeded: number;
    avgLatencyMs: number | null;
  }[];
  failures: { failureCode: string; count: number }[];
  daily: { day: string; total: number; failed: number; avgLatencyMs: number | null }[];
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
  jobs: {
    id: string;
    uploadId: string;
    revision: number;
    status: string;
    failureCode: string | null;
    model: string | null;
    promptVersion: string | null;
    latencyMs: number | null;
    createdAt: string;
    finishedAt: string | null;
  }[];
};

const percent = (part: number, whole: number) =>
  whole === 0 ? "-" : `${Math.round((part / whole) * 1000) / 10}%`;

const ms = (value: number | null) => (value === null ? "-" : `${value.toLocaleString()}ms`);

const when = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card width="200px">
      <CardContent>
        <CardCaption variant="caption1">{label}</CardCaption>
        <CardTitle variant="title3" weight="bold">
          {value}
        </CardTitle>
        {note ? <CardCaption variant="caption2">{note}</CardCaption> : null}
      </CardContent>
    </Card>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: "8px" }}>
      <Typography variant="headline1" weight="bold">
        {title}
      </Typography>
      {note ? <Typography variant="caption1">{note}</Typography> : null}
      {children}
    </FlexBox>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <Typography variant="body2">{children}</Typography>;
}

function RunButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="small" disabled={pending}>
      {pending ? "재평가 중" : "재평가 실행"}
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
    <form action={action}>
      <input type="hidden" name="lostId" value={pair.lostId} />
      <input type="hidden" name="sightingId" value={pair.sightingId} />
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="body2">
          {pair.score}점 · 제보 {pair.sightingId.slice(0, 8)} · 실종 {pair.lostId.slice(0, 8)}
        </Typography>
        <RunButton />
        {state.message ? (
          <Typography
            variant="caption1"
            color={state.ok ? "semantic.status.positive" : "semantic.status.negative"}
          >
            {state.message}
          </Typography>
        ) : null}
      </FlexBox>
    </form>
  );
}

export function AiView({ data }: { data: AiDashboard }) {
  const { summary, acceptance, breakdown } = data;
  const mockJobs = data.byModel
    .filter((row) => row.model === data.mockModel)
    .reduce((sum, row) => sum + row.total, 0);

  return (
    <>
      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="title3" weight="bold">
          AI
        </Typography>
        <Typography variant="caption1">
          비전 초안 {data.visionModel} · 유사도는 결정식 배점이고 개체 동일성을 확정하지 않음
        </Typography>
      </FlexBox>

      {mockJobs > 0 ? (
        <Card>
          <CardContent>
            <CardTitle variant="headline2" weight="bold">
              더미 초안 {mockJobs.toLocaleString()}건이 섞여 있습니다
            </CardTitle>
            <CardCaption variant="body2">
              ANALYZE_MOCK 으로 만든 기록입니다. 제출 자료의 수치는 {data.visionModel} 행만 씁니다.
            </CardCaption>
          </CardContent>
        </Card>
      ) : null}

      <Section title="분석 실행">
        {summary && summary.total > 0 ? (
          <FlexBox flexWrap="wrap" gap="12px">
            <Stat label="총 실행" value={summary.total.toLocaleString()} note={`마지막 ${when(summary.lastRunAt)}`} />
            <Stat
              label="성공률"
              value={percent(summary.succeeded, summary.total)}
              note={`성공 ${summary.succeeded} · 실패 ${summary.failed} · 진행 ${summary.running}`}
            />
            <Stat label="평균 지연" value={ms(summary.avgLatencyMs)} />
            <Stat label="p95 지연" value={ms(summary.p95LatencyMs)} note="사용자가 체감하는 꼬리" />
            <Stat
              label="최대 지연"
              value={ms(summary.maxLatencyMs)}
              note="이 값이 평균을 끌어올림"
            />
          </FlexBox>
        ) : (
          <Empty>아직 분석 실행 기록이 없습니다.</Empty>
        )}
      </Section>

      <Section title="모델과 프롬프트" note="더미 모델과 실제 호출을 갈라 봅니다">
        {data.byModel.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>모델</TableHeadCell>
                <TableHeadCell>프롬프트</TableHeadCell>
                <TableHeadCell>실행</TableHeadCell>
                <TableHeadCell>성공률</TableHeadCell>
                <TableHeadCell>평균 지연</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.byModel.map((row) => (
                <TableRow key={`${row.model}-${row.promptVersion}`}>
                  <TableCell>{row.model}</TableCell>
                  <TableCell>{row.promptVersion}</TableCell>
                  <TableCell>{row.total.toLocaleString()}</TableCell>
                  <TableCell>{percent(row.succeeded, row.total)}</TableCell>
                  <TableCell>{ms(row.avgLatencyMs)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty>기록이 없습니다.</Empty>
        )}
      </Section>

      <Section title="실패 사유" note="무엇을 먼저 고칠지 정하는 표입니다">
        {data.failures.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>실패 코드</TableHeadCell>
                <TableHeadCell>건수</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.failures.map((row) => (
                <TableRow key={row.failureCode}>
                  <TableCell>{row.failureCode}</TableCell>
                  <TableCell>{row.count.toLocaleString()}건</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty>실패한 실행이 없습니다.</Empty>
        )}
      </Section>

      <Divider />

      <Section title="초안 수용" note="사람이 고치지 않은 초안의 비율이 AI 정확도입니다">
        {acceptance && acceptance.withDraft > 0 ? (
          <>
            <FlexBox flexWrap="wrap" gap="12px">
              <Stat label="초안이 붙은 제보" value={acceptance.withDraft.toLocaleString()} />
              <Stat
                label="무수정 비율"
                value={percent(acceptance.untouched, acceptance.withDraft)}
                note={`무수정 ${acceptance.untouched}건`}
              />
              <Stat label="제보당 평균 수정" value={`${acceptance.avgEdits}개`} />
            </FlexBox>
            {data.editedFields.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>고쳐진 필드</TableHeadCell>
                    <TableHeadCell>수정 횟수</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.editedFields.map((row) => (
                    <TableRow key={row.field}>
                      <TableCell>{row.field}</TableCell>
                      <TableCell>{row.edits.toLocaleString()}회</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </>
        ) : (
          <Empty>AI 초안이 붙은 제보가 아직 없습니다.</Empty>
        )}
      </Section>

      <Section title="유사도 매칭" note="거리 35 · 시간 25 · 털색 20 · 크기 10 · 특징 10 배점">
        {breakdown && breakdown.pairs > 0 ? (
          <>
            <FlexBox flexWrap="wrap" gap="12px">
              <Stat label="채점된 쌍" value={breakdown.pairs.toLocaleString()} />
              <Stat label="평균 점수" value={`${breakdown.avgScore}점`} note={`최고 ${breakdown.maxScore}점`} />
            </FlexBox>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>항목</TableHeadCell>
                  <TableHeadCell>평균</TableHeadCell>
                  <TableHeadCell>배점</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(
                  [
                    ["거리", breakdown.distance, 35],
                    ["시간", breakdown.time, 25],
                    ["털색", breakdown.color, 20],
                    ["크기", breakdown.size, 10],
                    ["특징", breakdown.features, 10],
                  ] as const
                ).map(([label, value, weight]) => (
                  <TableRow key={label}>
                    <TableCell>{label}</TableCell>
                    <TableCell>{value}점</TableCell>
                    <TableCell>{weight}점</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.scoreBuckets.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>점수 구간</TableHeadCell>
                    <TableHeadCell>쌍</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.scoreBuckets.map((row) => (
                    <TableRow key={row.bucket}>
                      <TableCell>{row.bucket}점</TableCell>
                      <TableCell>{row.count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </>
        ) : (
          <Empty>채점된 후보 쌍이 아직 없습니다.</Empty>
        )}
      </Section>

      <Section
        title="Claude 재평가"
        note={`${data.reviewModel} 가 후보 한 쌍을 다시 읽고 겹치는 점과 어긋나는 점을 적습니다`}
      >
        {data.reviewSummary.length > 0 ? (
          <FlexBox flexWrap="wrap" gap="12px">
            {data.reviewSummary.map((row) => (
              <Stat
                key={row.verdict}
                label={row.label}
                value={row.total.toLocaleString()}
                note={ms(row.avgLatencyMs)}
              />
            ))}
          </FlexBox>
        ) : null}

        {data.unreviewed.length > 0 ? (
          <FlexBox flexDirection="column" gap="8px">
            <Typography variant="label1">아직 재평가하지 않은 상위 후보</Typography>
            {data.unreviewed.map((pair) => (
              <ReviewRunner key={`${pair.lostId}-${pair.sightingId}`} pair={pair} />
            ))}
          </FlexBox>
        ) : (
          <Empty>재평가할 후보가 없습니다.</Empty>
        )}

        {data.reviews.length > 0 ? (
          <FlexBox flexDirection="column" gap="8px">
            {data.reviews.map((review) => (
              <Card key={`${review.lostId}-${review.sightingId}`}>
                <CardContent>
                  <FlexBox alignItems="center" flexWrap="wrap" gap="8px">
                    <Typography variant="label1" weight="bold">
                      {review.label}
                    </Typography>
                    <Typography variant="caption1">
                      {review.model} · {ms(review.latencyMs)} · {when(review.createdAt)}
                    </Typography>
                  </FlexBox>
                  {review.agreements.length > 0 ? (
                    <CardCaption variant="body2">
                      겹침 {review.agreements.join(" · ")}
                    </CardCaption>
                  ) : null}
                  {review.conflicts.length > 0 ? (
                    <CardCaption variant="body2">
                      어긋남 {review.conflicts.join(" · ")}
                    </CardCaption>
                  ) : null}
                  {review.checkFirst ? (
                    <CardCaption variant="body2">먼저 확인 {review.checkFirst}</CardCaption>
                  ) : null}
                  <CardCaption variant="caption2">
                    <Link
                      href={`/sightings/${review.sightingId}`}
                      style={{ color: "inherit" }}
                    >
                      제보 {review.sightingId.slice(0, 8)}
                    </Link>
                    {" · "}
                    실종 {review.lostId.slice(0, 8)}
                  </CardCaption>
                </CardContent>
              </Card>
            ))}
          </FlexBox>
        ) : null}

        <Typography variant="caption1">
          재평가는 확인할 값어치만 말하고 개체 동일성을 확정하지 않습니다.
        </Typography>
      </Section>

      <Divider />

      <Section title={`최근 분석 작업 ${data.jobs.length}건`}>
        {data.jobs.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>시각</TableHeadCell>
                <TableHeadCell>상태</TableHeadCell>
                <TableHeadCell>모델</TableHeadCell>
                <TableHeadCell>지연</TableHeadCell>
                <TableHeadCell>실패 코드</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{when(job.createdAt)}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.model ?? "-"}</TableCell>
                  <TableCell>{ms(job.latencyMs)}</TableCell>
                  <TableCell>{job.failureCode ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty>기록이 없습니다.</Empty>
        )}
      </Section>
    </>
  );
}
