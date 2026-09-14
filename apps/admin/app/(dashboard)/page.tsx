import Link from "next/link";
import {
  adminOverview,
  countPendingFlags,
  listAdminReports,
} from "@rebirth/db";
import {
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  Chip,
  Divider,
  FlexBox,
  Typography,
} from "@wanteddev/wds";

import {
  ANIMAL_LABEL,
  CARE_LABEL,
  KIND_LABEL,
  VISIBILITY_LABEL,
  describeAnimal,
  when,
} from "@/lib/labels";

// 숨김 처리와 새 제보가 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 5;

export default async function DashboardPage() {
  const [overview, flags, recent] = await Promise.all([
    adminOverview().catch(() => null),
    countPendingFlags().catch(() => null),
    listAdminReports({ kind: "sighting", visibility: "public", limit: RECENT_LIMIT }).catch(
      () => [],
    ),
  ]);

  const tiles = overview
    ? [
        { label: "전체 기록", value: overview.total, note: "삭제 제외" },
        { label: "발견 제보", value: overview.sightings, note: "" },
        { label: "실종 신고", value: overview.lost, note: "" },
        { label: "최근 24시간", value: overview.last24h, note: "신규 등록" },
        { label: "숨김", value: overview.hidden, note: "운영자 판정" },
        { label: "검수 대기", value: flags?.reports ?? 0, note: "미판정 신고" },
      ]
    : [];

  return (
    <>
      <Typography variant="title3" weight="bold">
        개요
      </Typography>

      {tiles.length > 0 ? (
        <FlexBox flexWrap="wrap" gap="12px">
          {tiles.map((tile) => (
            <Card key={tile.label} width="180px">
              <CardContent>
                <CardCaption variant="caption1">{tile.label}</CardCaption>
                <CardTitle variant="title2" weight="bold">
                  {tile.value.toLocaleString()}
                </CardTitle>
                {tile.note ? <CardCaption variant="caption2">{tile.note}</CardCaption> : null}
              </CardContent>
            </Card>
          ))}
        </FlexBox>
      ) : (
        <Typography variant="body2">집계를 읽지 못했습니다.</Typography>
      )}

      <Divider />

      <Typography variant="headline1" weight="bold">
        최근 제보
      </Typography>
      <FlexBox flexDirection="column" gap="8px">
        {recent.map((report) => (
          <Link
            key={report.id}
            href={`/sightings/${report.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Card>
              <CardContent>
                <FlexBox alignItems="center" flexWrap="wrap" gap="6px">
                  <Chip size="xsmall" disableInteraction>
                    {KIND_LABEL[report.kind]}
                  </Chip>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {ANIMAL_LABEL[report.animalType]}
                  </Chip>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {CARE_LABEL[report.careSituation]}
                  </Chip>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {VISIBILITY_LABEL[report.visibility]}
                  </Chip>
                  <Typography variant="caption1">{when(report.occurredAt)}</Typography>
                </FlexBox>
                <CardTitle variant="headline2">
                  {report.appearance ?? describeAnimal(report)}
                </CardTitle>
                <CardCaption variant="caption1">
                  {report.areaName ?? "위치 미확인"}
                </CardCaption>
              </CardContent>
            </Card>
          </Link>
        ))}
        {recent.length === 0 ? (
          <Typography variant="body2">공개된 제보가 없습니다.</Typography>
        ) : null}
      </FlexBox>
    </>
  );
}
