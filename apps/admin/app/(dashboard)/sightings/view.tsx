"use client";

import Link from "next/link";

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
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold">제보</h1>
        <span className="text-xs text-muted-foreground">총 {items.length}건</span>
      </div>

      <Card>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">제보 없음</p>
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
                    <TableCell className="max-w-96">
                      <Link
                        href={`/sightings/${item.id}`}
                        className="line-clamp-2 underline underline-offset-2"
                      >
                        {item.appearance ?? describeAnimal(item)}
                      </Link>
                    </TableCell>
                    <TableCell>{SIZE_LABEL[item.size]}</TableCell>
                    <TableCell>{CARE_LABEL[item.careSituation]}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.areaName ?? "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {item.aiModel
                        ? `${item.aiModel} · 수정 ${item.aiEditedFields.length}개`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{VISIBILITY_LABEL[item.visibility]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{LIFECYCLE_LABEL[item.lifecycle]}</Badge>
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
