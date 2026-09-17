"use client";

import { useEffect, useState } from "react";
import { Grid, Skeleton, Text, VStack } from "@seed-design/react";

import { ReportCard, type ReportCardItem } from "@/components/report/report-card";
import { useRecentViews } from "@/components/mine/recent-views";

// 최근 본 제보. id 만 브라우저에 있어 카드 자료는 서버에서 되받음

const SKELETON_ROWS = [0, 1];

export function RecentReports() {
  const ids = useRecentViews();
  const [items, setItems] = useState<ReportCardItem[] | null>(null);

  useEffect(() => {
    // 볼 것이 없으면 요청도 상태 변경도 하지 않음
    if (ids.length === 0) return;

    let cancelled = false;
    void fetch(`/api/cards?ids=${ids.join(",")}`)
      .then((response) => (response.ok ? (response.json() as Promise<{ items: ReportCardItem[] }>) : null))
      .then((body) => {
        if (!cancelled) setItems(body?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (ids.length === 0 || items?.length === 0) {
    return (
      <VStack align="stretch" gap="x1">
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          최근에 본 제보가 없습니다
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralSubtle">
          지도에서 제보를 열어 보면 여기에 쌓입니다
        </Text>
      </VStack>
    );
  }

  if (items === null) {
    return (
      <Grid columns={2} gap="x4">
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} width="full" height="150px" radius="16" />
        ))}
      </Grid>
    );
  }

  return (
    <Grid columns={2} gap="x4">
      {items.map((item) => (
        <ReportCard key={item.id} item={item} />
      ))}
    </Grid>
  );
}
