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
import { ANIMAL_LABEL, LOST_PETS, SIZE_LABEL } from "@/lib/mock";

const COLUMNS = [
  "마지막 목격",
  "종류",
  "털색",
  "크기",
  "특징",
  "지역",
  "상태",
  "후보",
] as const;

const STATUS_LABEL = { searching: "찾는 중", resolved: "종료" } as const;

export function LostView() {
  const searching = LOST_PETS.filter((l) => l.status === "searching").length;

  return (
    <>
      <FlexBox alignItems="center" gap="8px">
        <Typography variant="title3" weight="bold">
          실종 신고
        </Typography>
        <Typography variant="caption1">
          총 {LOST_PETS.length}건 · 찾는 중 {searching}건
        </Typography>
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
          {LOST_PETS.map((l) => (
            <TableRow key={l.id} interaction>
              <TableCell>{l.lastSeenAt}</TableCell>
              <TableCell>{ANIMAL_LABEL[l.animalType]}</TableCell>
              <TableCell>{l.colors.join(", ") || "미기재"}</TableCell>
              <TableCell>{SIZE_LABEL[l.size]}</TableCell>
              <TableCell>{l.features}</TableCell>
              <TableCell>{l.lastSeenArea}</TableCell>
              <TableCell>
                <Chip size="xsmall" variant="outlined" disableInteraction>
                  {STATUS_LABEL[l.status]}
                </Chip>
              </TableCell>
              <TableCell>{l.candidateCount}건</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="caption1">
        연락처는 저장하지 않습니다. 보호자는 익명 조회 토큰으로만 접근합니다.
      </Typography>
    </>
  );
}
