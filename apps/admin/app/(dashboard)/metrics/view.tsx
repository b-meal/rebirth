"use client";

import {
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

  return (
    <>
      <Typography variant="title3" weight="bold">
        지표
      </Typography>

      {overview ? (
        <FlexBox flexWrap="wrap" gap="12px">
          <Card width="200px">
            <CardContent>
              <CardCaption variant="caption1">발견 제보</CardCaption>
              <CardTitle variant="title2" weight="bold">
                {overview.sightings.toLocaleString()}
              </CardTitle>
            </CardContent>
          </Card>
          <Card width="200px">
            <CardContent>
              <CardCaption variant="caption1">실종 신고</CardCaption>
              <CardTitle variant="title2" weight="bold">
                {overview.lost.toLocaleString()}
              </CardTitle>
            </CardContent>
          </Card>
          <Card width="200px">
            <CardContent>
              <CardCaption variant="caption1">만남으로 종료</CardCaption>
              <CardTitle variant="title2" weight="bold">
                {overview.resolved.toLocaleString()}
              </CardTitle>
              <CardCaption variant="caption2">제보자가 직접 표시</CardCaption>
            </CardContent>
          </Card>
        </FlexBox>
      ) : (
        <Typography variant="body2">집계를 읽지 못했습니다.</Typography>
      )}

      <Divider />

      <Typography variant="headline1" weight="bold">
        최근 등록 추이
      </Typography>
      {data.daily.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>날짜</TableHeadCell>
              <TableHeadCell>발견 제보</TableHeadCell>
              <TableHeadCell>실종 신고</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.daily.map((row) => (
              <TableRow key={row.day}>
                <TableCell>{row.day}</TableCell>
                <TableCell>{row.sightings.toLocaleString()}</TableCell>
                <TableCell>{row.lost.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2">최근 등록이 없습니다.</Typography>
      )}

      <Typography variant="headline1" weight="bold">
        보호 상황
      </Typography>
      {data.care.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>상황</TableHeadCell>
              <TableHeadCell>제보</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.care.map((row) => (
              <TableRow key={row.careSituation}>
                <TableCell>{CARE_LABEL[row.careSituation]}</TableCell>
                <TableCell>{row.total.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Typography variant="headline1" weight="bold">
        지역 상위 {data.areas.length}곳
      </Typography>
      {data.areas.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>행정동</TableHeadCell>
              <TableHeadCell>제보</TableHeadCell>
              <TableHeadCell>배회 중</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.areas.map((row) => (
              <TableRow key={row.areaName}>
                <TableCell>{row.areaName}</TableCell>
                <TableCell>{row.total.toLocaleString()}</TableCell>
                <TableCell>{row.roaming.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </>
  );
}
