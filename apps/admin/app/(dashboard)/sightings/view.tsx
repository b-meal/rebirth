"use client";

import Link from "next/link";
import {
  Chip,
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
  CUSTODY_LABEL,
  SIGHTINGS,
  SIZE_LABEL,
  STATUS_LABEL,
} from "@/lib/mock";

// 공개 응답과 동일하게 정확 좌표 열을 두지 않음
const COLUMNS = [
  "제보 시각",
  "종류",
  "외형",
  "크기",
  "보호 상황",
  "행정동",
  "상태",
] as const;

export function SightingsView() {
  return (
    <>
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="title3" weight="bold">
          제보
        </Typography>
        <Typography variant="caption1">총 {SIGHTINGS.length}건</Typography>
      </FlexBox>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHeadCell key={column}>{column}</TableHeadCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {SIGHTINGS.map((s) => (
            <TableRow key={s.id} interaction>
              <TableCell>{s.sightedAt}</TableCell>
              <TableCell>{ANIMAL_LABEL[s.animalType]}</TableCell>
              <TableCell>
                <Link
                  href={`/sightings/${s.id}`}
                  style={{ color: "inherit", textDecoration: "underline" }}
                >
                  {s.appearance}
                </Link>
              </TableCell>
              <TableCell>{SIZE_LABEL[s.size]}</TableCell>
              <TableCell>{CUSTODY_LABEL[s.custody]}</TableCell>
              <TableCell>{s.areaName}</TableCell>
              <TableCell>
                <Chip size="xsmall" variant="outlined" disableInteraction>
                  {STATUS_LABEL[s.status]}
                </Chip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="caption1">
        정확 좌표는 운영 화면에도 표시하지 않습니다. 품종은 단정하지 않고 계열
        추정으로만 적습니다.
      </Typography>
    </>
  );
}
