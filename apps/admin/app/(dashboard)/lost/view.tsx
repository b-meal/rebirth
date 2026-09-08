"use client";

import {
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  Table,
  TableBody,
  TableHead,
  TableHeadCell,
  TableRow,
  Typography,
} from "@wanteddev/wds";

const COLUMNS = ["접수 시각", "종류", "특징", "마지막 목격", "상태"] as const;

export function LostView() {
  return (
    <>
      <Typography variant="title3" weight="bold">
        실종 신고
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHeadCell key={column}>{column}</TableHeadCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody />
      </Table>
      <FallbackView>
        <FallbackViewContent>
          <FallbackViewText
            title="실종 신고 연결 전"
            description="lost_pets 테이블이 붙으면 채워집니다. 연락처는 저장하지 않고 익명 조회 토큰만 씁니다."
          />
        </FallbackViewContent>
      </FallbackView>
    </>
  );
}
