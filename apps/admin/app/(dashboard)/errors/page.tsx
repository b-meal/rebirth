import { logFailure } from "@rebirth/core/http";
import { listErrorEvents } from "@rebirth/db";
import type { Metadata } from "next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 서버에서 난 실패를 종류별로 묶어 보여 줌
// Vercel 무료 플랜은 런타임 로그가 한 시간만 남아 이 표가 사실상 유일한 기록임

export const metadata: Metadata = { title: "오류" };

export const dynamic = "force-dynamic";

const ROWS = 100;

function when(value: Date): string {
  return value.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

export default async function ErrorsPage() {
  let rows: Awaited<ReturnType<typeof listErrorEvents>> = [];
  try {
    rows = await listErrorEvents(ROWS);
  } catch (error) {
    logFailure("admin.errors", error);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">오류</h1>
        <p className="text-xs text-muted-foreground">
          같은 종류는 한 줄로 묶고 발생 수만 올림
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">기록된 오류가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>태그</TableHead>
                <TableHead className="w-16 text-right">건수</TableHead>
                <TableHead>메시지</TableHead>
                <TableHead className="w-44">마지막</TableHead>
                <TableHead className="w-44">처음</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.fingerprint}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {row.level === "notice" ? "· " : ""}
                    {row.tag}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  <TableCell className="max-w-xl">
                    <span className="block truncate" title={row.message}>
                      {row.message}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {when(row.lastSeenAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {when(row.firstSeenAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
