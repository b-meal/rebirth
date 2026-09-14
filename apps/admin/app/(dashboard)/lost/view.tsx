"use client";

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
  LIFECYCLE_LABEL,
  SIZE_LABEL,
  VISIBILITY_LABEL,
  breedLabel,
  when,
} from "@/lib/labels";

// 보호자 연락처를 저장하지 않으므로 이 화면에도 연락 수단이 없음

export type LostRow = {
  id: string;
  animalType: string;
  colors: string[];
  size: string;
  breedGuess: string | null;
  conditionTags: string[];
  areaName: string | null;
  lifecycle: string;
  visibility: string;
  occurredAt: string;
};

const COLUMNS = [
  "실종 시각",
  "종류",
  "털색",
  "크기",
  "특징",
  "지역",
  "진행",
  "공개",
] as const;

export function LostView({ items }: { items: LostRow[] }) {
  const searching = items.filter((item) => item.lifecycle === "searching").length;

  return (
    <>
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="title3" weight="bold">
          실종 신고
        </Typography>
        <Typography variant="caption1">
          총 {items.length}건 · 찾는 중 {searching}건
        </Typography>
      </FlexBox>

      {items.length === 0 ? (
        <Typography variant="body2">실종 신고가 없습니다.</Typography>
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
                <TableCell>{item.colors.join(", ") || "미기재"}</TableCell>
                <TableCell>{SIZE_LABEL[item.size]}</TableCell>
                <TableCell>
                  {[breedLabel(item.breedGuess), ...item.conditionTags]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </TableCell>
                <TableCell>{item.areaName ?? "-"}</TableCell>
                <TableCell>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {LIFECYCLE_LABEL[item.lifecycle]}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="xsmall" variant="outlined" disableInteraction>
                    {VISIBILITY_LABEL[item.visibility]}
                  </Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Typography variant="caption1">
        연락처는 저장하지 않습니다. 보호자는 익명 조회 토큰으로만 접근합니다.
      </Typography>
    </>
  );
}
