import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { PawPrintIcon } from "@hugeicons/core-free-icons";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "제보" };

// 공개 응답과 동일하게 정확 좌표 열을 두지 않음
const COLUMNS = ["제보 시각", "종류", "외형", "행정동", "상태"] as const;

export default function SightingsPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">제보</h1>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody />
        </Table>
      </div>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={PawPrintIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>제보 목록 연결 전</EmptyTitle>
          <EmptyDescription>
            sightings 테이블 스키마와 조회 API가 붙으면 채워집니다. 정확 좌표는
            운영 화면에도 표시하지 않습니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  );
}
