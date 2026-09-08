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

// 공개 응답과 동일하게 정확 좌표 열을 두지 않음
const COLUMNS = ["제보 시각", "종류", "외형", "행정동", "상태"] as const;

export function SightingsView() {
  return (
    <>
      <Typography variant="title3" weight="bold">
        제보
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
            title="제보 목록 연결 전"
            description="sightings 테이블 스키마와 조회 API가 붙으면 채워집니다. 정확 좌표는 운영 화면에도 표시하지 않습니다."
          />
        </FallbackViewContent>
      </FallbackView>
    </>
  );
}
