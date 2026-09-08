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
  Typography,
} from "@wanteddev/wds";
import {
  ANIMAL_LABEL,
  CUSTODY_LABEL,
  OVERVIEW,
  SIGHTINGS,
  STATUS_LABEL,
} from "@/lib/mock";

export default function DashboardPage() {
  const recent = SIGHTINGS.filter((s) => s.status !== "hidden").slice(0, 3);

  return (
    <>
      <Typography variant="title3" weight="bold">
        개요
      </Typography>
      <FlexBox flexWrap="wrap" gap="12px">
        {OVERVIEW.map((tile) => (
          <Card key={tile.label} width="220px">
            <CardContent>
              <CardCaption variant="caption1">{tile.label}</CardCaption>
              <CardTitle variant="title2" weight="bold">
                {tile.value}
              </CardTitle>
              <CardCaption variant="caption2">{tile.source}</CardCaption>
            </CardContent>
          </Card>
        ))}
      </FlexBox>

      <Divider />

      <Typography variant="headline1" weight="bold">
        최근 제보
      </Typography>
      <FlexBox flexDirection="column" gap="8px">
        {recent.map((s) => (
          <Link
            key={s.id}
            href={`/sightings/${s.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Card>
              <CardContent>
                <FlexBox alignItems="center" flexWrap="wrap" gap="6px">
                  <Chip size="xsmall" disableInteraction>
                    {ANIMAL_LABEL[s.animalType]}
                  </Chip>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {CUSTODY_LABEL[s.custody]}
                  </Chip>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {STATUS_LABEL[s.status]}
                  </Chip>
                  <Typography variant="caption1">{s.sightedAt}</Typography>
                </FlexBox>
                <CardTitle variant="headline2">{s.appearance}</CardTitle>
                <CardCaption variant="caption1">
                  {s.areaName} · 확인할 후보 {s.candidateCount}건
                </CardCaption>
              </CardContent>
            </Card>
          </Link>
        ))}
      </FlexBox>
      <Typography variant="caption1">
        목데이터입니다. API 연결 시 lib/mock 대신 조회 결과를 넣습니다.
      </Typography>
    </>
  );
}
