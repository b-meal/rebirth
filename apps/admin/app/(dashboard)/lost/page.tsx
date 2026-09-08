import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchAlertIcon } from "@hugeicons/core-free-icons";
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

export const metadata: Metadata = { title: "실종 신고" };

const COLUMNS = ["접수 시각", "종류", "특징", "마지막 목격", "상태"] as const;

export default function LostPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">실종 신고</h1>
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
            <HugeiconsIcon icon={SearchAlertIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>실종 신고 연결 전</EmptyTitle>
          <EmptyDescription>
            lost_pets 테이블이 붙으면 채워집니다. 연락처는 저장하지 않고 익명
            조회 토큰만 씁니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  );
}
