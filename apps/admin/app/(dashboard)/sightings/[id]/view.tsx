"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ANIMAL_LABEL,
  CARE_LABEL,
  KIND_LABEL,
  LIFECYCLE_LABEL,
  LOCATION_SOURCE_LABEL,
  SIZE_LABEL,
  VISIBILITY_LABEL,
  breedLabel,
  describeAnimal,
  when,
} from "@/lib/labels";

// 운영 상세. 정확 좌표와 제보자 식별자는 조회 단계에서 이미 빠져 있음. POL-25

const BREAKDOWN_LABEL: Record<string, string> = {
  distance: "거리 35",
  time: "시간 25",
  color: "털색 20",
  size: "크기 10",
  features: "특징 10",
};

export type SightingDetail = {
  id: string;
  kind: string;
  animalType: string;
  breedGuess: string | null;
  appearance: string | null;
  colors: string[];
  size: string;
  careSituation: string;
  conditionTags: string[];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  areaName: string | null;
  areaCode: string | null;
  locationSource: string | null;
  coarseGridM: number | null;
  visibility: string;
  lifecycle: string;
  version: number;
  aiModel: string | null;
  aiEditedFields: string[];
  aiAnalyzedAt: string | null;
  occurredAt: string;
  createdAt: string;
  photoCount: number;
  flags: { id: string; reason: string; resolvedAt: string | null; createdAt: string }[];
  matches: { lostId: string; score: number; breakdown: Record<string, unknown> }[];
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

const tri = (value: boolean | null) =>
  value === null ? "확인되지 않음" : value ? "있음" : "없음";

export function SightingDetailView({ detail }: { detail: SightingDetail }) {
  const pendingFlags = detail.flags.filter((flag) => flag.resolvedAt === null).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">제보 상세</h1>
        <Badge variant="secondary">{KIND_LABEL[detail.kind]}</Badge>
        <Badge variant="outline">{VISIBILITY_LABEL[detail.visibility]}</Badge>
        <Badge variant="outline">{LIFECYCLE_LABEL[detail.lifecycle]}</Badge>
        {pendingFlags > 0 ? (
          <Badge variant="destructive">미판정 신고 {pendingFlags}건</Badge>
        ) : null}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-normal">
              {detail.appearance ?? describeAnimal(detail)}
            </CardTitle>
            <CardDescription>
              {detail.areaName ?? "위치 미확인"} · 발견 {when(detail.occurredAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label="종류" value={ANIMAL_LABEL[detail.animalType] ?? "-"} />
            <Row label="품종" value={breedLabel(detail.breedGuess) ?? "적지 않음"} />
            <Row label="털색" value={detail.colors.join(", ") || "미기재"} />
            <Row label="크기" value={SIZE_LABEL[detail.size] ?? "-"} />
            <Row label="보호 상황" value={CARE_LABEL[detail.careSituation] ?? "-"} />
            <Row label="상태 표시" value={detail.conditionTags.join(", ") || "없음"} />
            <Row label="목줄 또는 하네스" value={tri(detail.collar)} />
            <Row label="눈에 보이는 부상" value={tri(detail.injury)} />
            <Row label="귀 끝 잘림" value={tri(detail.earTip)} />
            <Row label="사진" value={`${detail.photoCount}장`} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>AI 초안</CardTitle>
              </CardHeader>
            <CardContent className="divide-y divide-border">
              <Row label="모델" value={detail.aiModel ?? "초안 없음"} />
              <Row label="분석 시각" value={when(detail.aiAnalyzedAt)} />
              <Row
                label="사람이 고친 필드"
                value={detail.aiEditedFields.join(", ") || "없음"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>위치와 판</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <Row label="행정동 코드" value={detail.areaCode ?? "-"} />
              <Row
                label="좌표 출처"
                value={
                  detail.locationSource
                    ? (LOCATION_SOURCE_LABEL[detail.locationSource] ?? detail.locationSource)
                    : "-"
                }
              />
              <Row label="격자" value={detail.coarseGridM ? `${detail.coarseGridM}m` : "-"} />
              <Row label="등록" value={when(detail.createdAt)} />
              <Row label="판" value={`v${detail.version}`} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <h2 className="text-base font-bold">확인할 후보 {detail.matches.length}건</h2>
      <Card>
        <CardContent>
          {detail.matches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>실종 신고</TableHead>
                  <TableHead className="text-right">점수</TableHead>
                  <TableHead>항목별</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.matches.map((match) => (
                  <TableRow key={match.lostId}>
                    <TableCell>
                      <Link
                        href={`/sightings/${match.lostId}`}
                        className="underline underline-offset-2"
                      >
                        {match.lostId.slice(-8)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{match.score}점</TableCell>
                    <TableCell className="text-muted-foreground">
                      {Object.entries(BREAKDOWN_LABEL)
                        .map(([key, label]) => `${label}: ${match.breakdown[key] ?? "-"}`)
                        .join(" · ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">채점된 후보 없음</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
