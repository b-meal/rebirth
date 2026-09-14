"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Button,
  Chip,
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

import {
  BarList,
  DayBars,
  Grid,
  Hero,
  Metric,
  Panel,
  Ratio,
  TrackBar,
} from "@/components/charts";
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
    <Button type="submit" size="small" variant="outlined" disabled={pending}>
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
    <form action={action}>
      <FlexBox alignItems="center" justifyContent="space-between" gap="8px">
        <input type="hidden" name="lostId" value={pair.lostId} />
        <input type="hidden" name="sightingId" value={pair.sightingId} />
        <Typography variant="caption1" color="semantic.label.alternative">
          {pair.score}점 · 제보 {shortId(pair.sightingId)}
        </Typography>
        <FlexBox alignItems="center" gap="6px">
          {state.message ? (
            <Typography
              variant="caption2"
              color={state.ok ? "semantic.status.positive" : "semantic.status.negative"}
            >
              {state.message}
            </Typography>
          ) : null}
          <RunButton />
        </FlexBox>
      </FlexBox>
    </form>
  );
}

function ReviewCard({ review }: { review: AiDashboard["reviews"][number] }) {
  return (
    <FlexBox
      flexDirection="column"
      gap="6px"
      sx={{
        padding: "12px",
        borderRadius: "4px",
        background: "semantic.background.normal.alternative",
      }}
    >
      <FlexBox alignItems="center" flexWrap="wrap" gap="6px">
        <Chip size="xsmall" disableInteraction>
          {review.label}
        </Chip>
        <Typography variant="caption2" color="semantic.label.assistive">
          {review.model} · {ms(review.latencyMs)} · {when(review.createdAt)}
        </Typography>
      </FlexBox>
      {review.agreements.length > 0 ? (
        <Typography variant="caption1">겹침 {review.agreements.join(" · ")}</Typography>
      ) : null}
      {review.conflicts.length > 0 ? (
        <Typography variant="caption1" color="semantic.status.negative">
          어긋남 {review.conflicts.join(" · ")}
        </Typography>
      ) : null}
      {review.checkFirst ? (
        <Typography variant="caption1" color="semantic.label.alternative">
          먼저 확인 {review.checkFirst}
        </Typography>
      ) : null}
      <Link
        href={`/sightings/${review.sightingId}`}
        style={{ color: "inherit", fontSize: "12px" }}
      >
        제보 {shortId(review.sightingId)} 열기
      </Link>
    </FlexBox>
  );
}

function NeighborCard({ pair }: { pair: AiDashboard["neighbors"][number] }) {
  return (
    <FlexBox
      flexDirection="column"
      gap="6px"
      sx={{
        padding: "12px",
        borderRadius: "4px",
        background: "semantic.background.normal.alternative",
      }}
    >
      <FlexBox alignItems="center" gap="8px">
        <Typography
          variant="label1"
          weight="bold"
          sx={{ fontVariantNumeric: "tabular-nums" }}
          color={pair.scored ? "semantic.label.normal" : "semantic.primary.normal"}
        >
          {pair.similarity.toFixed(3)}
        </Typography>
        <Chip size="xsmall" variant="outlined" disableInteraction>
          {pair.scored ? "배점도 올림" : "배점이 놓침"}
        </Chip>
      </FlexBox>
      <Typography variant="caption1" color="semantic.label.alternative">
        실종 {pair.lostText}
      </Typography>
      <Typography variant="caption1">제보 {pair.sightingText}</Typography>
      <Link
        href={`/sightings/${pair.sightingId}`}
        style={{ color: "inherit", fontSize: "12px" }}
      >
        제보 {shortId(pair.sightingId)} 열기
      </Link>
    </FlexBox>
  );
}

export function AiView({ data }: { data: AiDashboard }) {
  const { real, acceptance, breakdown, coverage } = data;
  const missed = data.neighbors.filter((pair) => !pair.scored).length;
  const reviewTotal = data.reviewSummary.reduce((sum, row) => sum + row.total, 0);

  return (
    <FlexBox flexDirection="column" gap="20px">
      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="title3" weight="bold">
          AI 파이프라인
        </Typography>
        <Typography variant="caption1" color="semantic.label.alternative">
          사진을 초안으로, 문장을 벡터로, 후보를 근거로. 세 자리가 서로 못 보는 곳을 메웁니다
        </Typography>
      </FlexBox>

      {/* 1. 세 축이 지금 어떤 상태인지 */}
      <Grid>
        <Panel title="사진 → 외형 초안" note={data.models.vision}>
          {real && real.total > 0 ? (
            <>
              <Ratio
                value={real.succeeded}
                total={real.total}
                label={`성공 ${real.succeeded}/${real.total}`}
              />
              <FlexBox gap="20px" flexWrap="wrap">
                <Metric label="평균" value={ms(real.avgLatencyMs)} />
                <Metric label="p95" value={ms(real.p95LatencyMs)} />
                <Metric label="마지막" value={when(real.lastRunAt)} />
                {data.orphanFailures > 0 ? (
                  <Metric
                    label="모델 기록 전 실패"
                    value={String(data.orphanFailures)}
                    unit="건"
                    tone="negative"
                    note="어느 모델인지 알 수 없음"
                  />
                ) : null}
              </FlexBox>
            </>
          ) : (
            <Typography variant="body2" color="semantic.label.alternative">
              실제 호출 기록이 없습니다.
            </Typography>
          )}
        </Panel>

        <Panel title="문장 → 의미 벡터" note={`${data.models.embedding} · 384차원`}>
          {coverage && coverage.reports > 0 ? (
            <>
              <Ratio
                value={coverage.embedded}
                total={coverage.reports}
                label={`${coverage.embedded.toLocaleString()} / ${coverage.reports.toLocaleString()}건`}
              />
              <FlexBox gap="20px" flexWrap="wrap">
                <Metric
                  label="배점이 놓친 쌍"
                  value={String(missed)}
                  unit="건"
                  tone="accent"
                  note="아래 증거 참고"
                />
                <Metric label="마지막 생성" value={when(coverage.lastAt)} />
              </FlexBox>
            </>
          ) : (
            <Typography variant="body2" color="semantic.label.alternative">
              아직 만들어진 벡터가 없습니다.
            </Typography>
          )}
        </Panel>

        <Panel title="후보 → 확인 근거" note={data.models.review}>
          {reviewTotal > 0 ? (
            <>
              <Hero value={reviewTotal.toLocaleString()} unit="쌍" label="근거를 붙인 후보" />
              <BarList
                rows={data.reviewSummary.map((row) => ({
                  label: row.label,
                  value: row.total,
                  note: `${row.total}쌍`,
                }))}
              />
              <Metric
                label="평균 지연"
                value={ms(data.reviewSummary[0]?.avgLatencyMs ?? null)}
              />
              {data.unreviewed.length > 0 ? (
                <FlexBox flexDirection="column" gap="6px">
                  <Typography variant="caption1" color="semantic.label.alternative">
                    아직 재평가하지 않은 상위 후보
                  </Typography>
                  {data.unreviewed.map((pair) => (
                    <ReviewRunner key={`${pair.lostId}-${pair.sightingId}`} pair={pair} />
                  ))}
                </FlexBox>
              ) : null}
            </>
          ) : (
            <Typography variant="body2" color="semantic.label.alternative">
              아직 재평가한 후보가 없습니다.
            </Typography>
          )}
        </Panel>
      </Grid>

      {data.mockRuns > 0 ? (
        <Typography variant="caption1" color="semantic.label.alternative">
          위 성공률은 배포된 모델 {data.models.vision} 의 {real?.total ?? 0}건 기준입니다. 화면을
          돌려보려고 만든 더미 {data.mockRuns.toLocaleString()}건과 일회성 모델 실험은 뺐고, 전체
          실행은 {data.totalRuns.toLocaleString()}건입니다.
        </Typography>
      ) : null}

      <Divider />

      {/* 2. 세 축이 서로를 메운다는 증거 */}
      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="headline2" weight="bold">
          세 축이 서로를 메웁니다
        </Typography>
        <Typography variant="caption1" color="semantic.label.alternative">
          한 축만으로는 후보를 고르지 못합니다. 아래는 각 축이 실제로 찾아낸 것입니다
        </Typography>
      </FlexBox>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell>축</TableHeadCell>
            <TableHeadCell>보는 것</TableHeadCell>
            <TableHeadCell>못 보는 것</TableHeadCell>
            <TableHeadCell>지금</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>결정식 배점</TableCell>
            <TableCell>거리 · 시각 · 털색 · 크기 · 특징</TableCell>
            <TableCell>같은 뜻을 다르게 쓴 문장</TableCell>
            <TableCell>
              {breakdown ? `${breakdown.pairs}쌍 · 평균 ${breakdown.avgScore}점` : "-"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>의미 벡터</TableCell>
            <TableCell>외형 문장의 의미</TableCell>
            <TableCell>거리와 시각</TableCell>
            <TableCell>
              {coverage ? `${coverage.embedded.toLocaleString()}건 임베딩` : "-"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Claude 재평가</TableCell>
            <TableCell>두 기록을 읽고 겹침과 어긋남</TableCell>
            <TableCell>비용과 지연이 후보 수만큼 늘어남</TableCell>
            <TableCell>{reviewTotal > 0 ? `${reviewTotal}쌍 판정` : "-"}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Grid>
        <Panel
          title="벡터가 찾고 배점이 놓친 쌍"
          note="문장 의미가 가까운 순. 파란 값은 배점 후보에 없던 쌍입니다"
        >
          {data.neighbors.length > 0 ? (
            <FlexBox flexDirection="column" gap="8px">
              {data.neighbors.map((pair) => (
                <NeighborCard key={`${pair.lostId}-${pair.sightingId}`} pair={pair} />
              ))}
            </FlexBox>
          ) : (
            <Typography variant="body2" color="semantic.label.alternative">
              아직 이웃을 찾지 못했습니다.
            </Typography>
          )}
        </Panel>

        <Panel
          title="Claude 가 쓴 확인 근거"
          note="개체 동일성을 확정하지 않고 확인할 값어치만 적습니다"
        >
          {data.reviews.length > 0 ? (
            <FlexBox flexDirection="column" gap="8px">
              {data.reviews.map((review) => (
                <ReviewCard key={`${review.lostId}-${review.sightingId}`} review={review} />
              ))}
            </FlexBox>
          ) : (
            <Typography variant="body2" color="semantic.label.alternative">
              아직 재평가한 후보가 없습니다.
            </Typography>
          )}
        </Panel>
      </Grid>

      <Divider />

      {/* 3. 품질 */}
      <Typography variant="headline2" weight="bold">
        품질
      </Typography>

      <Grid>
        <Panel title="일자별 실행" note={`최근 ${data.days.length}일 · 더미 포함`}>
          <DayBars rows={data.days.map((d) => ({ day: d.day, value: d.total }))} />
        </Panel>

        <Panel title="일자별 실패" note="같은 기간, 같은 눈금이 아니라 실패만 따로 봅니다">
          <DayBars
            rows={data.days.map((d) => ({ day: d.day, value: d.failed }))}
            tone="negative"
          />
          {data.failures.length > 0 ? (
            <BarList
              rows={data.failures.map((row) => ({
                label: row.failureCode,
                value: row.count,
                note: `${row.count}건`,
              }))}
              tone="negative"
            />
          ) : null}
        </Panel>

        <Panel title="유사도 배점 항목별 평균" note="배점 대비 실제로 받은 점수">
          {breakdown && breakdown.pairs > 0 ? (
            <FlexBox flexDirection="column" gap="10px">
              <TrackBar label="거리" value={breakdown.distance} max={35} valueText={`${breakdown.distance} / 35`} />
              <TrackBar label="시각" value={breakdown.time} max={25} valueText={`${breakdown.time} / 25`} />
              <TrackBar label="털색" value={breakdown.color} max={20} valueText={`${breakdown.color} / 20`} />
              <TrackBar label="크기" value={breakdown.size} max={10} valueText={`${breakdown.size} / 10`} />
              <TrackBar label="특징" value={breakdown.features} max={10} valueText={`${breakdown.features} / 10`} />
            </FlexBox>
          ) : (
            <Typography variant="body2" color="semantic.label.alternative">
              채점된 쌍이 없습니다.
            </Typography>
          )}
        </Panel>

        <Panel title="후보 점수 분포" note="임계값을 어디에 둘지 판단하는 근거">
          <BarList
            rows={data.scoreBuckets.map((row) => ({
              label: `${row.bucket}점`,
              value: row.count,
              note: `${row.count}쌍`,
            }))}
            emptyText="채점된 쌍이 없습니다"
          />
        </Panel>

        <Panel title="AI 초안을 사람이 고친 필드" note="고치지 않은 초안의 비율이 곧 정확도">
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
                  note: `${row.edits}회`,
                }))}
                emptyText="고쳐진 필드가 없습니다"
              />
            </>
          ) : (
            <Typography variant="body2" color="semantic.label.alternative">
              초안이 붙은 제보가 아직 없습니다. 새 제보부터 모델과 원본이 함께 저장됩니다.
            </Typography>
          )}
        </Panel>

        <Panel title="모델별 실행" note="더미와 실제 호출을 갈라 봅니다">
          <BarList
            rows={data.byModel.map((row) => ({
              label: row.model,
              value: row.total,
              note: `${row.total}회 · ${ms(row.avgLatencyMs)}`,
            }))}
            emptyText="기록이 없습니다"
          />
        </Panel>
      </Grid>

      <Divider />

      {/* 4. 원장 */}
      <Typography variant="headline2" weight="bold">
        최근 실행 {data.jobs.length}건
      </Typography>
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
                <TableCell>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {job.status === "succeeded" ? "성공" : job.status === "failed" ? "실패" : job.status}
                  </Chip>
                </TableCell>
                <TableCell>{job.model ?? "-"}</TableCell>
                <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {ms(job.latencyMs)}
                </TableCell>
                <TableCell>{job.failureCode ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2" color="semantic.label.alternative">
          기록이 없습니다.
        </Typography>
      )}
    </FlexBox>
  );
}
