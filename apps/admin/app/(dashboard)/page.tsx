import Link from "next/link";

import { adminOverview, countPendingFlags, listAdminReports } from "@rebirth/db";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ANIMAL_LABEL,
  CARE_LABEL,
  KIND_LABEL,
  VISIBILITY_LABEL,
  describeAnimal,
  when,
} from "@/lib/labels";

// 숨김 처리와 새 제보가 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 5;

export default async function DashboardPage() {
  const [overview, flags, recent] = await Promise.all([
    adminOverview().catch(() => null),
    countPendingFlags().catch(() => null),
    listAdminReports({ kind: "sighting", visibility: "public", limit: RECENT_LIMIT }).catch(
      () => [],
    ),
  ]);

  const tiles = overview
    ? [
        { label: "전체 기록", value: overview.total, note: "삭제 제외" },
        { label: "발견 제보", value: overview.sightings, note: "" },
        { label: "실종 신고", value: overview.lost, note: "" },
        { label: "최근 24시간", value: overview.last24h, note: "신규 등록" },
        { label: "숨김", value: overview.hidden, note: "운영자 판정" },
        { label: "검수 대기", value: flags?.reports ?? 0, note: "미판정 신고" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">개요</h1>

      {tiles.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardContent className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{tile.label}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {tile.value.toLocaleString()}
                </span>
                {tile.note ? (
                  <span className="text-[11px] text-muted-foreground">{tile.note}</span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">집계를 읽지 못했습니다.</p>
      )}

      <Separator />

      <h2 className="text-base font-bold">최근 제보</h2>
      <div className="flex flex-col gap-2">
        {recent.map((report) => (
          <Link key={report.id} href={`/sightings/${report.id}`}>
            <Card className="hover:bg-accent/40">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{KIND_LABEL[report.kind]}</Badge>
                  <Badge variant="outline">{ANIMAL_LABEL[report.animalType]}</Badge>
                  <Badge variant="outline">{CARE_LABEL[report.careSituation]}</Badge>
                  <Badge variant="outline">{VISIBILITY_LABEL[report.visibility]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {when(report.occurredAt)}
                  </span>
                </div>
                <CardTitle className="line-clamp-2 font-normal">
                  {report.appearance ?? describeAnimal(report)}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {report.areaName ?? "위치 미확인"}
                </span>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">공개된 제보가 없습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
