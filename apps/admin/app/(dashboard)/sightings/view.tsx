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
  Typography,
  TableRow,
} from "@wanteddev/wds";

import {
  ANIMAL_LABEL,
  CARE_LABEL,
  LIFECYCLE_LABEL,
  SIZE_LABEL,
  VISIBILITY_LABEL,
  describeAnimal,
  when,
} from "@/lib/labels";

// 공개 응답과 동일하게 정확 좌표 열을 두지 않음. POL-25

export type AdminReportRow = {
  id: string;
  animalType: string;
  appearance: string | null;
  colors: string[];
  size: string;
  careSituation: string;
  areaName: string | null;
  visibility: string;
  lifecycle: string;
  aiModel: string | null;
  aiEditedFields: string[];
  occurredAt: string;
};

const COLUMNS = [
  "제보 시각",
  "종류",
  "외형",
  "크기",
  "보호 상황",
  "행정동",
  "AI 초안",
  "공개",
  "진행",
] as const;

export function SightingsView({ items }: { items: AdminReportRow[] }) {
  return (
    <>
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="title3" weight="bold">
          제보
        </Typography>
        <Typography variant="caption1">총 {items.length}건</Typography>
      </FlexBox>

      {items.length === 0 ? (
        <Typography variant="body2">제보가 없습니다.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHeadCell key={column}>{column}</TableHeadCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} interaction>
                <TableCell>{when(item.occurredAt)}</TableCell>
                <TableCell>{ANIMAL_LABEL[item.animalType]}</TableCell>
                <TableCell>
                  <Link
                    href={`/sightings/${item.id}`}
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    {item.appearance ?? describeAnimal(item)}
                  </Link>
                </TableCell>
                <TableCell>{SIZE_LABEL[item.size]}</TableCell>
                <TableCell>{CARE_LABEL[item.careSituation]}</TableCell>
                <TableCell>{item.areaName ?? "-"}</TableCell>
                <TableCell>
                  {item.aiModel
                    ? `${item.aiModel} · 수정 ${item.aiEditedFields.length}개`
                    : "-"}
                </TableCell>
                <TableCell>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {VISIBILITY_LABEL[item.visibility]}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {LIFECYCLE_LABEL[item.lifecycle]}
                  </Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Typography variant="caption1">
        정확 좌표는 운영 화면에도 표시하지 않습니다. 품종은 단정하지 않고 계열 추정으로만 적습니다.
      </Typography>
    </>
  );
}
