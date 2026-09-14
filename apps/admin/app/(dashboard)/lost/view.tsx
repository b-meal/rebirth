"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const COLUMNS = ["실종 시각", "종류", "털색", "크기", "특징", "지역", "진행", "공개"] as const;

export function LostView({ items }: { items: LostRow[] }) {
  const searching = items.filter((item) => item.lifecycle === "searching").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold">실종 신고</h1>
        <span className="text-xs text-muted-foreground">
          총 {items.length}건 · 찾는 중 {searching}건
        </span>
      </div>

      <Card>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">실종 신고가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {when(item.occurredAt)}
                    </TableCell>
                    <TableCell>{ANIMAL_LABEL[item.animalType]}</TableCell>
                    <TableCell>{item.colors.join(", ") || "미기재"}</TableCell>
                    <TableCell>{SIZE_LABEL[item.size]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[breedLabel(item.breedGuess), ...item.conditionTags]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{item.areaName ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{LIFECYCLE_LABEL[item.lifecycle]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{VISIBILITY_LABEL[item.visibility]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
