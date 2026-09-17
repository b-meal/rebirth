"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Grid, Text, VStack } from "@seed-design/react";

import { ReportCard, type ReportCardItem } from "@/components/report/report-card";

// 시트 목록은 반경 안 제보가 몇백 건이어도 화면에 든 줄만 그림
// 다 그리면 첫 화면에서 카드와 사진이 한꺼번에 나가 정작 보이는 두 장이 늦게 뜸

const COLUMNS = 2;

// 화면 위아래로 더 그려 두는 줄 수. 손가락이 닿기 전에 이미 자리에 있음
const OVERSCAN_ROWS = 1;

// 요소는 만들지 않고 사진만 미리 받아 두는 줄 수
const PREFETCH_ROWS = 4;

// 스크롤 전에는 한 줄만 미리 받음. 안 볼 사진까지 받으면 보이는 사진이 밀림
const IDLE_PREFETCH_ROWS = 1;

// 줄 높이를 재기 전에 쓰는 어림값. 정사각 사진에 글 세 줄
const ESTIMATED_ROW = 200;

type NearbyListProps = {
  items: ReportCardItem[];
  /** 시트를 끌어 올린 만큼 바뀌는 목록 높이 */
  height: string;
};

export function NearbyList({ items, height }: NearbyListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);
  // 한 줄이 차지하는 높이와 줄 사이 여백, 재기 전에는 어림값으로 자리만 잡음
  const [row, setRow] = useState({ height: ESTIMATED_ROW, gap: 0 });
  const [scrolled, setScrolled] = useState(false);

  // 실제 카드에서 줄 높이를 재 토큰 값이 바뀌어도 자리 계산이 따라감
  const measure = useCallback(() => {
    const scroller = scrollRef.current;
    if (scroller) setViewport(scroller.clientHeight);

    const grid = gridRef.current;
    const card = grid?.firstElementChild;
    if (!grid || !card) return;
    const gap = Number.parseFloat(getComputedStyle(grid).rowGap) || 0;
    const height = card.getBoundingClientRect().height;
    if (height <= 0) return;
    setRow((prev) =>
      Math.abs(prev.height - (height + gap)) > 1 ? { height: height + gap, gap } : prev,
    );
  }, []);

  // 시트를 끌면 목록 높이가 바뀌고 글꼴이 늦게 오면 카드 높이가 바뀜, 둘 다 다시 잼
  useEffect(() => {
    measure();
    const scroller = scrollRef.current;
    if (!scroller || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    const card = gridRef.current?.firstElementChild;
    if (card) observer.observe(card);
    return () => observer.disconnect();
  }, [measure, items.length]);

  // 스크롤마다 상태를 갈면 손가락보다 렌더가 늦음, 한 프레임에 한 번만 읽음
  const frame = useRef(0);
  const onScroll = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const scroller = scrollRef.current;
      if (!scroller) return;
      setScrollTop(scroller.scrollTop);
      if (scroller.scrollTop > 0) setScrolled(true);
    });
  }, []);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const rows = Math.ceil(items.length / COLUMNS);
  const visibleRows = Math.ceil((viewport || ESTIMATED_ROW) / row.height) + 1;
  const startRow = Math.max(0, Math.floor(scrollTop / row.height) - OVERSCAN_ROWS);
  const endRow = Math.min(rows, startRow + visibleRows + OVERSCAN_ROWS * 2);

  const slice = items.slice(startRow * COLUMNS, endRow * COLUMNS);
  const offset = startRow * row.height;
  const total = Math.max(0, rows * row.height - row.gap);

  // 다음 줄 사진은 요소를 만들기 전에 받아 둠, 줄이 들어올 때 이미 캐시에 있음
  const prefetched = useRef(new Set<string>());
  useEffect(() => {
    if (typeof Image === "undefined") return;
    const reach = scrolled ? PREFETCH_ROWS : IDLE_PREFETCH_ROWS;
    for (const item of items.slice(endRow * COLUMNS, (endRow + reach) * COLUMNS)) {
      const url = item.photoUrl;
      if (!url || prefetched.current.has(url)) continue;
      prefetched.current.add(url);
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = url;
    }
  }, [items, endRow, scrolled]);

  return (
    /* 아래 여백은 떠 있는 내비게이션이 가리는 만큼 비워 두는 자리 */
    <Box
      ref={scrollRef}
      height={height}
      px="spacingX.globalGutter"
      pb="x16"
      overflowY="auto"
      onScroll={onScroll}
    >
      {items.length === 0 ? (
        <VStack py="x2" gap="x1" align="stretch">
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            이 지역에는 아직 제보가 없어요
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralSubtle">
            지도를 옮기면 다른 지역의 제보를 볼 수 있어요
          </Text>
        </VStack>
      ) : (
        /* 안 그린 줄만큼 높이를 비워 둬야 스크롤 막대가 목록 길이를 그대로 말함 */
        <Box position="relative" style={{ height: `${total}px` }}>
          <Grid
            ref={gridRef}
            position="absolute"
            top="0"
            left="0"
            right="0"
            columns={COLUMNS}
            gap="x4"
            style={{ transform: `translateY(${offset}px)` }}
          >
            {slice.map((item) => (
              <ReportCard key={item.id} item={item} />
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
