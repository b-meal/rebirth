"use client";

import {
  Card,
  CardCaption,
  CardContent,
  CardTitle,
  FlexBox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Typography,
} from "@wanteddev/wds";
import { METRICS, SIGHTINGS } from "@/lib/mock";

export function MetricsView() {
  const edited = SIGHTINGS.filter((s) => s.aiEditedFields.length > 0);
  const fieldCounts = SIGHTINGS.flatMap((s) => s.aiEditedFields).reduce<
    Record<string, number>
  >((acc, field) => ({ ...acc, [field]: (acc[field] ?? 0) + 1 }), {});

  return (
    <>
      <Typography variant="title3" weight="bold">
        지표
      </Typography>
      <FlexBox flexWrap="wrap" gap="12px">
        {METRICS.map((m) => (
          <Card key={m.label} width="240px">
            <CardContent>
              <CardCaption variant="caption1">{m.label}</CardCaption>
              <CardTitle variant="title2" weight="bold">
                {m.value}
              </CardTitle>
              <CardCaption variant="caption2">{m.source}</CardCaption>
              <CardCaption variant="caption2">{m.note}</CardCaption>
            </CardContent>
          </Card>
        ))}
      </FlexBox>

      <Typography variant="headline1" weight="bold">
        AI 초안이 고쳐진 필드
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell>필드</TableHeadCell>
            <TableHeadCell>수정 횟수</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(fieldCounts).map(([field, count]) => (
            <TableRow key={field}>
              <TableCell>{field}</TableCell>
              <TableCell>{count}회</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="caption1">
        제보 {SIGHTINGS.length}건 중 {edited.length}건에서 초안을 고쳤습니다.
        실제 정확도는 평가용 테스트 이미지 20장으로 측정한 뒤 대체합니다.
      </Typography>
    </>
  );
}
