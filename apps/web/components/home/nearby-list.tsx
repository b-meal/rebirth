"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Box, Grid, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import { hasPhoto, prefetchThumb } from "@/hooks/use-thumb-url";
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
  /** 시트가 화면 밖으로 내려가 있는 만큼, 마지막 장까지 밀어 올릴 수 있게 목록 끝에 더함 */
  tailPx: number;
  /** 시트가 스크롤 상자를 알아야 손짓을 넘겨받을 수 있어 바깥 ref 를 함께 받음 */
  scrollElementRef?: (element: HTMLDivElement | null) => void;
};

// 홈 화면이 다시 그려져도 반경 안 제보와 꼬리 길이가 같으면 React Compiler 가 건너뜀, 손으로 memo 하지 않음
export function NearbyList({ items, tailPx, scrollElementRef }: NearbyListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);
  // 한 줄이 차지하는 높이와 줄 사이 여백, 재기 전에는 어림값으로 자리만 잡음
  const [row, setRow] = useState({ height: ESTIMATED_ROW, gap: 0 });
  const [scrolled, setScrolled] = useState(false);

  // 시트를 끌면 목록 높이가 바뀌고 글꼴이 늦게 오면 카드 높이가 바뀜, 둘 다 다시 잼
  // 재는 함수는 이 effect 에서만 쓰여 안에 둠, 밖에 두면 의존성 규칙이 useCallback 을 요구함
  useEffect(() => {
    // 실제 카드에서 줄 높이를 재 토큰 값이 바뀌어도 자리 계산이 따라감
    const measure = () => {
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
    };

    measure();
    const scroller = scrollRef.current;
    if (!scroller || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    const card = gridRef.current?.firstElementChild;
    if (card) observer.observe(card);
    return () => observer.disconnect();
  }, [items.length]);

  // 스크롤마다 상태를 갈면 손가락보다 렌더가 늦음, 한 프레임에 한 번만 읽음
  const frame = useRef(0);
  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const scroller = scrollRef.current;
      if (!scroller) return;
      setScrollTop(scroller.scrollTop);
      if (scroller.scrollTop > 0) setScrolled(true);
    });
  };

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
  // 화면 밖으로 내려가 있는 만큼을 끝에 더해야 어느 단계에서도 마지막 줄까지 올라옴
  const total = Math.max(0, rows * row.height - row.gap) + tailPx;

  // 다음 줄 사진은 요소를 만들기 전에 받아 둠, 줄이 들어올 때 이미 캐시에 있음
  const prefetched = useRef(new Set<string>());
  useEffect(() => {
    const reach = scrolled ? PREFETCH_ROWS : IDLE_PREFETCH_ROWS;
    for (const item of items.slice(endRow * COLUMNS, (endRow + reach) * COLUMNS)) {
      if (!hasPhoto(item) || prefetched.current.has(item.id)) continue;
      prefetched.current.add(item.id);
      prefetchThumb(item);
    }
  }, [items, endRow, scrolled]);

  return (
    /* 아래 여백은 떠 있는 내비게이션이 가리는 만큼 비워 두는 자리
       높이는 시트가 남긴 만큼 채움, 단계가 바뀌어도 상자 크기가 그대로라 자리를 다시 재지 않음 */
    <Box
      ref={(element: HTMLDivElement | null) => {
        scrollRef.current = element;
        scrollElementRef?.(element);
      }}
      flexGrow={1}
      minHeight="0"
      px="spacingX.globalGutter"
      pb="x16"
      overflowY="auto"
      // 맨 위나 아래에 닿은 뒤의 손짓이 문서로 이어지지 않음. 시트 안에서만 스크롤이 끝남
      className="rebirth-scroll-contain"
      onScroll={onScroll}
    >
      {items.length === 0 ? (
        /* 핀이 없는 지도가 이 앱을 처음 여는 사람의 첫 화면이 되므로
           여기서 무엇을 하는 곳인지와 바로 할 일 하나를 말함 */
        <VStack py="x2" gap="x3" align="stretch">
          <VStack gap="x1" align="stretch">
            <Text textStyle="t4Regular" color="fg.neutralMuted">
              이 지역에는 아직 제보가 없어요
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralSubtle">
              다시집은 길에서 만난 동물을 제보하고 잃어버린 가족을 찾는 곳이에요. 지도를 옮기면
              다른 지역의 제보를 볼 수 있어요
            </Text>
          </VStack>
          <HStack align="stretch">
            <ActionButton variant="brandSolid" size="medium" flexGrow={1} asChild>
              <Link href="/report">제보하기</Link>
            </ActionButton>
          </HStack>
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
