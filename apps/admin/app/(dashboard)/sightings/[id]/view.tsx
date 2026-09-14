"use client";

import Link from "next/link";
import {
  Card,
  CardCaption,
  CardContent,
  CardTitle,
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
    <FlexBox justifyContent="space-between" gap="16px">
      <Typography variant="label2">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </FlexBox>
  );
}

const tri = (value: boolean | null) =>
  value === null ? "확인되지 않음" : value ? "있음" : "없음";

export function SightingDetailView({ detail }: { detail: SightingDetail }) {
  const pendingFlags = detail.flags.filter((flag) => flag.resolvedAt === null).length;

  return (
    <>
      <FlexBox alignItems="center" flexWrap="wrap" gap="8px">
        <Typography variant="title3" weight="bold">
          제보 상세
        </Typography>
        <Chip size="xsmall" disableInteraction>
          {KIND_LABEL[detail.kind]}
        </Chip>
        <Chip size="xsmall" variant="outlined" disableInteraction>
          {VISIBILITY_LABEL[detail.visibility]}
        </Chip>
        <Chip size="xsmall" variant="outlined" disableInteraction>
          {LIFECYCLE_LABEL[detail.lifecycle]}
        </Chip>
        {pendingFlags > 0 ? (
          <Chip size="xsmall" disableInteraction>
            미판정 신고 {pendingFlags}건
          </Chip>
        ) : null}
      </FlexBox>

      <Card>
        <CardContent>
          <CardTitle variant="headline2">
            {detail.appearance ?? describeAnimal(detail)}
          </CardTitle>
          <CardCaption variant="caption1">
            {detail.areaName ?? "위치 미확인"} · 발견 {when(detail.occurredAt)}
          </CardCaption>
          <FlexBox flexDirection="column" gap="6px" sx={{ marginTop: "12px" }}>
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
          </FlexBox>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardTitle variant="headline2">AI 초안</CardTitle>
          <FlexBox flexDirection="column" gap="6px" sx={{ marginTop: "12px" }}>
            <Row label="모델" value={detail.aiModel ?? "초안 없음"} />
            <Row label="분석 시각" value={when(detail.aiAnalyzedAt)} />
            <Row
              label="사람이 고친 필드"
              value={detail.aiEditedFields.join(", ") || "없음"}
            />
          </FlexBox>
          <CardCaption variant="caption2">
            AI 초안은 수정 가능한 제안이고 품종을 단정하지 않습니다.
          </CardCaption>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardTitle variant="headline2">위치와 판</CardTitle>
          <FlexBox flexDirection="column" gap="6px" sx={{ marginTop: "12px" }}>
            <Row label="행정동" value={detail.areaName ?? "-"} />
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
          </FlexBox>
          <CardCaption variant="caption2">
            정확 좌표는 운영 화면에도 내려오지 않습니다.
          </CardCaption>
        </CardContent>
      </Card>

      <Divider />

      <Typography variant="headline1" weight="bold">
        확인할 후보 {detail.matches.length}건
      </Typography>
      {detail.matches.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>실종 신고</TableHeadCell>
              <TableHeadCell>점수</TableHeadCell>
              <TableHeadCell>항목별</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detail.matches.map((match) => (
              <TableRow key={match.lostId}>
                <TableCell>
                  <Link
                    href={`/sightings/${match.lostId}`}
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    {match.lostId.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>{match.score}점</TableCell>
                <TableCell>
                  {Object.entries(BREAKDOWN_LABEL)
                    .map(([key, label]) => `${label}: ${match.breakdown[key] ?? "-"}`)
                    .join(" · ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2">채점된 후보가 없습니다.</Typography>
      )}

      <Typography variant="caption1">
        점수는 확인할 후보의 순서일 뿐이고 개체 동일성을 확정하지 않습니다.
      </Typography>
    </>
  );
}
